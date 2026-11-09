#!/usr/bin/env python3
"""READ-ONLY: reconcile the nine remaining top-level Aqua menus with legacy WooCommerce.
No taxonomy/product/media mutation. Verify hierarchy by parent + name/slug, and record
every source ID, product type and target slug collision before enabling any migration.
"""
import html,http.cookiejar,json,os,re,time,urllib.parse,urllib.request,urllib.error
from pathlib import Path
SOURCE="https://aquathanhxuan.com"
DEST="https://admin.aquathanhxuan.io.vn"
ROOT_NAMES=("Máy lọc","Vật liệu lọc","Phụ kiện","Đá / Lũa / Cát","Hóa chất","Bể kính","Nền","CO2","Sinh vật")
OUT=Path("artifacts/aqua-remaining-catalog")
OUT.mkdir(parents=True,exist_ok=True)
result={"project":"aquathanhxuan.com","source":SOURCE,"target":DEST,"read_only":True,
        "roots":[],"categories":[],"unique_products":[],"failures":[],"state":"STARTED",
        "started":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}
def save():(OUT/"inventory.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
save()
def norm(v):return " ".join(html.unescape(re.sub(r"<[^>]*>"," ",str(v or ""))).casefold().split())
assert os.environ.get("WP_ADMIN_USERNAME") and os.environ.get("WP_ADMIN_PASSWORD"),"Missing WP credentials"
env=dict(kv for kv in (tuple(x.split("=",1)) for x in os.environ.get("ENV_FILE","").splitlines() if "=" in x and not x.lstrip().startswith("#")) if len(kv)==2)
assert env.get("WC_URL","").strip("\"'")==DEST,"Wrong WP target"
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders=[("User-Agent","AquaVerifiedRemainingCatalogInventory/1.0")]
def request(url,method="GET",data=None,headers=None):
  for attempt in range(3):
    try:
      with opener.open(urllib.request.Request(url,data=data,method=method,headers=headers or {}),timeout=60) as r:return r.read()
    except urllib.error.HTTPError as e:
      if method=="GET" and e.code in (429,500,502,503,504) and attempt<2:time.sleep(2*(attempt+1));continue
      raise
    except (TimeoutError,ConnectionError,OSError,urllib.error.URLError):
      if method=="GET" and attempt<2:time.sleep(2*(attempt+1));continue
      raise
def src(url):return json.loads(request(SOURCE+url,headers={"Cache-Control":"no-cache"}))
def pages(base,max_pages=100):
  out=[]
  for page in range(1,max_pages+1):
    endpoint=base+("&" if "?" in base else "?")+"per_page=100&page="+str(page)
    rows=src(endpoint) if base.startswith("/") else json.loads(request(endpoint,headers={"X-WP-Nonce":nonce}))
    assert isinstance(rows,list),"Expected paged list "+endpoint
    out.extend(rows)
    if len(rows)<100:return out
  raise RuntimeError("Pagination cap reached "+base)
source_cats=pages("/wp-json/wc/store/v1/products/categories",30)
print("AQUA_SOURCE_ROOT_TERMS="+json.dumps([{"id":x["id"],"name":x.get("name"),"slug":x.get("slug")} for x in source_cats if not int(x.get("parent") or 0)],ensure_ascii=False),flush=True)
assert all(isinstance(c.get("id"),int) and c.get("slug") for c in source_cats),"Bad source taxonomy"
request(DEST+"/wp-login.php")
body=urllib.parse.urlencode({"log":os.environ["WP_ADMIN_USERNAME"],"pwd":os.environ["WP_ADMIN_PASSWORD"],
 "wp-submit":"Log In","redirect_to":DEST+"/wp-admin/","testcookie":"1"}).encode()
dash=request(DEST+"/wp-login.php",method="POST",data=body,headers={"Content-Type":"application/x-www-form-urlencoded"}).decode("utf-8","replace")
assert "wp-admin-bar-my-account" in dash,"Target CMS auth failed"
m=re.search(r'wpApiSettings\s*=\s*(\{.*?\})\s*;',dash,re.S)
nonce=""
if m:
 try:nonce=json.loads(m.group(1)).get("nonce","")
 except ValueError:pass
if not nonce:
 m=re.search(r'"nonce"\s*:\s*"([A-Za-z0-9]+)"',dash);nonce=m.group(1) if m else ""
assert nonce,"Target WP nonce missing"
def dst(url):return json.loads(request(DEST+url,headers={"X-WP-Nonce":nonce,"Accept":"application/json"}))
target_cats=[]
for pg in range(1,60):
 rows=dst("/wp-json/wc/v3/products/categories?per_page=100&page="+str(pg))
 assert isinstance(rows,list)
 target_cats.extend(rows)
 if len(rows)<100:break
else:raise RuntimeError("Target category page cap")
assert len({c["id"] for c in source_cats})==len(source_cats)
assert len({c["id"] for c in target_cats})==len(target_cats)
print("AQUA_TARGET_ROOT_TERMS="+json.dumps([{"id":x["id"],"name":x.get("name"),"slug":x.get("slug")} for x in target_cats if not int(x.get("parent") or 0)],ensure_ascii=False),flush=True)
if json.loads(Path("cms-requests/remaining-catalog-inventory.json").read_text(encoding="utf-8")).get("mode")=="TAXONOMY_ONLY":
 result["state"]="TAXONOMY_ONLY_PASS";save()
 print("AQUA_REMAINING_TAXONOMY_ONLY_PASS="+str(len(source_cats)),flush=True)
 raise SystemExit(0)
print("AQUA_REMAINING_TAXONOMY_LOADED="+json.dumps({"source":len(source_cats),"target":len(target_cats)}),flush=True)
source_by_id={int(x["id"]):x for x in source_cats}
target_by_id={int(x["id"]):x for x in target_cats}
pairs={}
def match_category(src_cat,parent_target):
  candidates=[x for x in target_cats if int(x.get("parent") or 0)==parent_target and norm(x.get("name"))==norm(src_cat.get("name"))]
  if len(candidates)!=1:
    slugs=[x for x in target_cats if int(x.get("parent") or 0)==parent_target and x.get("slug")==src_cat.get("slug")]
    if len(slugs)==1:candidates=slugs
  if len(candidates)!=1:return None
  return candidates[0]
product_by_id={}
def add_listing(sc,dc,root_id,root_target):
  sid=int(sc["id"])
  products=pages("/wp-json/wc/store/v1/products?category="+str(sid),80)
  exact_count=0
  for p in products:
    pid=int(p["id"])
    assert p.get("slug") and p.get("name"),"Missing source Product slug/name"
    # Some Woo storefront queries include descendants; retain verified source term IDs.
    membership={int(x["id"]) for x in p.get("categories") or []}
    if sid in membership:exact_count+=1
    state=product_by_id.setdefault(pid,{"source_id":pid,"slug":p["slug"],"name":p["name"],
      "type":p.get("type"),"source_term_ids":[],"target_term_ids":[],"source_images":len(p.get("images") or []),
      "root_ids":[],"source_category_ids":[]})
    assert state["slug"]==p["slug"] and state["type"]==p.get("type"),"Conflicting Product identity"
    state["source_category_ids"]=sorted(set(state["source_category_ids"])|membership)
    state["source_term_ids"]=sorted(set(state["source_term_ids"])|{sid})
    state["root_ids"]=sorted(set(state["root_ids"])|{root_id})
    if dc:state["target_term_ids"]=sorted(set(state["target_term_ids"])|{int(dc["id"]),root_target})
  record={"source_category_id":sid,"source_slug":sc.get("slug"),"name":sc.get("name"),
          "source_parent":sc.get("parent"),"target_category_id":int(dc["id"]) if dc else None,
          "target_slug":dc.get("slug") if dc else None,"root_source_id":root_id,
          "store_listing_count":len(products),"source_exact_membership_count":exact_count}
  result["categories"].append(record)
  print("AQUA_REMAINING_CATEGORY="+json.dumps(record,ensure_ascii=False),flush=True)
  save()
root_ids=[]
for name in ROOT_NAMES:
  roots=[c for c in source_cats if norm(c.get("name"))==norm(name) and not int(c.get("parent") or 0)]
  if len(roots)!=1:
    result["failures"].append({"type":"SOURCE_ROOT_MISSING_OR_AMBIGUOUS","name":name,"matches":len(roots)})
    continue
  root=roots[0];sid=int(root["id"]);root_ids.append(sid)
  target=match_category(root,0)
  root_target=int(target["id"]) if target else 0
  if not target:result["failures"].append({"type":"TARGET_ROOT_MISSING","name":name,"source_slug":root.get("slug"),"source_id":sid})
  descendants=[]
  queue=[sid]
  while queue:
    p=queue.pop(0)
    for cat in source_cats:
      if int(cat.get("parent") or 0)==p:
        descendants.append(cat);queue.append(int(cat["id"]))
  # map child categories by exact parent and name. Do not create missing terms in inventory.
  pairs[sid]=target
  for cat in sorted(descendants,key=lambda c:(int(c.get("parent") or 0),c.get("slug") or "")):
    parent_target=pairs.get(int(cat.get("parent") or 0))
    mapped=match_category(cat,int(parent_target["id"])) if parent_target else None
    pairs[int(cat["id"])]=mapped
    if not mapped:result["failures"].append({"type":"TARGET_CHILD_MISSING","source_id":cat["id"],
        "source_slug":cat.get("slug"),"source_name":cat.get("name"),"source_parent":cat.get("parent")})
  result["roots"].append({"name":name,"source_id":sid,"source_slug":root["slug"],
    "target_id":root_target or None,"target_slug":target["slug"] if target else None,
    "child_count":len(descendants)})
  print("AQUA_REMAINING_ROOT="+json.dumps(result["roots"][-1],ensure_ascii=False),flush=True)
  for cat in [root]+descendants:add_listing(cat,pairs.get(int(cat["id"])),sid,root_target)
  save()
assert len(root_ids)==9,"Cannot find all nine requested source top-level menus"
# One target products pass, avoiding thousands of per-slug API calls.
dest_by_slug={}
for pg in range(1,201):
 rows=dst("/wp-json/wc/v3/products?status=any&per_page=100&page="+str(pg))
 assert isinstance(rows,list),"Destination Product page invalid"
 for p in rows:
  slug=p.get("slug")
  if slug in dest_by_slug:result["failures"].append({"type":"DUPLICATE_TARGET_SLUG","slug":slug})
  dest_by_slug[slug]=p
 if pg%5==0:print("AQUA_TARGET_PRODUCT_SCAN="+json.dumps({"page":pg,"seen":len(dest_by_slug)}),flush=True)
 if len(rows)<100:break
else:raise RuntimeError("Target products pagination cap reached")
types={}
for sid,item in sorted(product_by_id.items()):
  current=dest_by_slug.get(item["slug"])
  item["target_id"]=int(current["id"]) if current else None
  item["exists"]=bool(current)
  item["target_image_count"]=len(current.get("images") or []) if current else None
  item["missing_target_terms"]=sorted(set(item["target_term_ids"])-{int(c["id"]) for c in current.get("categories") or []}) if current else []
  item["target_origin_id"]=next((str(x.get("value")) for x in current.get("meta_data") or [] if x.get("key")=="_esc_origin_product_id"),None) if current else None
  if current and norm(item["name"])!=norm(current.get("name")):item["name_conflict"]=True
  if current and item["target_origin_id"] not in (None,str(sid)):item["source_id_conflict"]=True
  types[item["type"]]=types.get(item["type"],0)+1
result["unique_products"]=list(product_by_id.values())
result["unique_count"]=len(product_by_id)
result["target_scanned_count"]=len(dest_by_slug)
result["unique_missing"]=sum(not x["exists"] for x in product_by_id.values())
result["type_counts"]=types
result["empty_source_images"]=sum(not x["source_images"] for x in product_by_id.values())
result["identity_conflicts"]=sum(bool(x.get("name_conflict") or x.get("source_id_conflict")) for x in product_by_id.values())
result["missing_target_category_count"]=sum(x["type"].startswith("TARGET_") for x in result["failures"])
result["state"]="PASS" if not result["failures"] and not result["identity_conflicts"] else "NEEDS_MAPPING"
save()
print("AQUA_REMAINING_INVENTORY="+json.dumps({k:result[k] for k in ("state","unique_count","unique_missing","target_scanned_count","type_counts","empty_source_images","identity_conflicts","missing_target_category_count")},ensure_ascii=False),flush=True)
