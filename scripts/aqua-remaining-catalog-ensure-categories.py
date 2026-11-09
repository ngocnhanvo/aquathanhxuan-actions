#!/usr/bin/env python3
"""Create only four verified legacy Woo product terms missing at Aqua destination.
Does not change WordPress header menus; intentionally scoped idempotent taxonomy writes.
"""
import html,http.cookiejar,json,os,re,time,urllib.parse,urllib.request,urllib.error
from pathlib import Path
SRC="https://aquathanhxuan.com"
DST="https://admin.aquathanhxuan.io.vn"
# source ID: (source slug, parent source ID, target parent ID)
EXPECTED={
 2204:("loc-phu-may-loc",1809,1769),
 2184:("khac-vat-lieu-loc",1003,1770),
 2307:("cibi",972,1775),
 2323:("prodibio-nen-cho-be-thuy-sinh",972,1775),
}
OUT=Path("artifacts/aqua-remaining-catalog-taxonomy")
OUT.mkdir(parents=True,exist_ok=True)
journal={"scope":sorted(EXPECTED),"created":[],"existing":[],"state":"STARTED"}
def save():(OUT/"result.json").write_text(json.dumps(journal,ensure_ascii=False,indent=2)+"\n")
save()
env=dict(kv for kv in (tuple(x.split("=",1)) for x in os.environ.get("ENV_FILE","").splitlines() if "=" in x and not x.lstrip().startswith("#")) if len(kv)==2)
assert env.get("WC_URL","").strip("\"'")==DST,"Wrong WP target"
assert os.environ.get("WP_ADMIN_USERNAME") and os.environ.get("WP_ADMIN_PASSWORD")
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders=[("User-Agent","AquaVerifiedMissingTaxonomy/1.0")]
def raw(url,method="GET",data=None,headers=None):
 req=urllib.request.Request(url,method=method,data=data,headers=headers or {})
 with opener.open(req,timeout=70) as r:return r.read()
def source(path):return json.loads(raw(SRC+path).decode("utf-8"))
def normal(v):return " ".join(html.unescape(re.sub(r"<[^>]*>"," ",str(v or ""))).casefold().split())
source_cats=[]
for p in range(1,20):
 rows=source("/wp-json/wc/store/v1/products/categories?per_page=100&page="+str(p))
 source_cats+=rows
 if len(rows)<100:break
source_by_id={int(x["id"]):x for x in source_cats}
verified={}
for sid,(slug,parent_s,parent_t) in EXPECTED.items():
 c=source_by_id.get(sid)
 assert c and c["slug"]==slug and int(c.get("parent") or 0)==parent_s,"Legacy term changed "+str(sid)
 assert source_by_id[parent_s]["parent"]==0,"Legacy parent no longer root"
 verified[sid]={"slug":slug,"name":html.unescape(str(c["name"])),"parent":parent_t,"source_id":sid}
raw(DST+"/wp-login.php")
form=urllib.parse.urlencode({"log":os.environ["WP_ADMIN_USERNAME"],"pwd":os.environ["WP_ADMIN_PASSWORD"],
"wp-submit":"Log In","redirect_to":DST+"/wp-admin/","testcookie":"1"}).encode()
dash=raw(DST+"/wp-login.php","POST",form,{"Content-Type":"application/x-www-form-urlencoded"}).decode("utf-8","replace")
assert "wp-admin-bar-my-account" in dash,"CMS login denied"
m=re.search(r'wpApiSettings\s*=\s*(\{.*?\})\s*;',dash,re.S)
nonce=""
if m:
 try:nonce=json.loads(m.group(1)).get("nonce","")
 except ValueError:pass
if not nonce:
 m=re.search(r'"nonce"\s*:\s*"([A-Za-z0-9]+)"',dash);nonce=m.group(1) if m else ""
assert nonce,"CMS nonce missing"
def api(path,method="GET",data=None):
 headers={"X-WP-Nonce":nonce,"Accept":"application/json"}
 payload=None
 if data is not None:
  payload=json.dumps(data,ensure_ascii=False).encode("utf-8")
  headers["Content-Type"]="application/json; charset=utf-8"
 return json.loads(raw(DST+path,method,payload,headers))
for sid,item in sorted(verified.items()):
 allmatches=api("/wp-json/wc/v3/products/categories?slug="+urllib.parse.quote(item["slug"])+"&per_page=100")
 assert isinstance(allmatches,list) and len(allmatches)<=1,"Destination term slug collision"
 if allmatches:
  cat=allmatches[0]
  assert int(cat.get("parent") or 0)==item["parent"] and normal(cat.get("name"))==normal(item["name"]),"Different term owns slug"
  action="existing"
 else:
  parent=api("/wp-json/wc/v3/products/categories/"+str(item["parent"]))
  assert int(parent["id"])==item["parent"] and not int(parent.get("parent") or 0),"Target parent not a verified root"
  cat=api("/wp-json/wc/v3/products/categories","POST",{"name":item["name"],"slug":item["slug"],"parent":item["parent"]})
  action="created"
 check=api("/wp-json/wc/v3/products/categories/"+str(cat["id"]))
 assert check["slug"]==item["slug"] and normal(check["name"])==normal(item["name"]) and int(check["parent"])==item["parent"],"Taxonomy read-after-write mismatch"
 record={"source_id":sid,"target_id":int(check["id"]),"slug":item["slug"],"parent":item["parent"]}
 journal[action].append(record)
 print("AQUA_REMAINING_TAXONOMY_"+action.upper()+"="+json.dumps(record,ensure_ascii=False),flush=True)
 save()
journal["state"]="PASS"
save()
print("AQUA_REMAINING_TAXONOMY_PASS="+json.dumps({"created":len(journal["created"]),"existing":len(journal["existing"]),"scope":len(EXPECTED)}),flush=True)
