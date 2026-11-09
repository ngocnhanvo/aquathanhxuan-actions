#!/usr/bin/env python3
"""Read-only provenance audit for 13 deferred original-light product covers.

Inspect the three source Products without a Store cover for directly owned media,
and inspect exact-original URL snapshots / WordPress image CDN cache for the two
shared broken attachments. No CMS writes, no inferred filenames.
"""
import json, re, html, hashlib, urllib.parse, urllib.request, urllib.error, time
from pathlib import Path

SOURCE="https://aquathanhxuan.com"
IDS=(1814,1815,1816)
ORIGINALS=(
 (266690, "2017/09/Thiet-ke-chua-co-ten-2024-05-19T124426.236.png", [1440,954]),
 (266681, "2017/09/Thiet-ke-chua-co-ten-2024-05-19T123505.164.png", [1440,954]),
)
OUT=Path("artifacts/aqua-light-last-resort")
OUT.mkdir(parents=True,exist_ok=True)
REPORT={"source":SOURCE,"status":"STARTED","products":[],"attachments":[],"tested_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}
def save():
 (OUT/"result.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n")
save()
def fetch(url, timeout=16, maxbytes=7_500_000):
 req=urllib.request.Request(url, headers={"User-Agent":"AquaLightReadOnlySourceAudit/1.0","Accept":"*/*"})
 try:
  with urllib.request.urlopen(req,timeout=timeout) as r:
   payload=r.read(maxbytes+1)
   return {"status":r.status,"type":r.headers.get("Content-Type",""),
     "size":len(payload),"payload":payload[:maxbytes],"truncated":len(payload)>maxbytes}
 except urllib.error.HTTPError as e:
  return {"status":e.code, "error":e.reason}
 except Exception as e:
  return {"status":"NETWORK_ERROR","error":str(e)[:180]}
def public(x):
 return {k:v for k,v in x.items() if k!="payload"}
def is_png(x):
 p=x.get("payload") or b""
 if len(p)<24 or not p.startswith(b"\x89PNG\r\n\x1a\n"):return None
 import struct
 return list(struct.unpack(">II",p[16:24]))
def owned_candidates(product):
 urls=[]
 for prop in ("description","short_description"):
  raw=html.unescape(str(product.get(prop) or ""))
  urls += re.findall(r"https?://aquathanhxuan\.com/wp-content/uploads/[^\s\"'<>]+",raw,re.I)
 images=product.get("images") or []
 urls += [str(x.get("src") or "") for x in images]
 return list(dict.fromkeys(x.split("?",1)[0] for x in urls if x.startswith(SOURCE+"/wp-content/uploads/")))
for sid in IDS:
 r=fetch(SOURCE+"/wp-json/wc/store/v1/products/"+str(sid),timeout=25)
 assert r.get("status")==200,"Source Store Product unavailable "+str(sid)
 item=json.loads(r["payload"])
 assert int(item.get("id") or 0)==sid
 attached=fetch(SOURCE+"/wp-json/wp/v2/media?parent="+str(sid)+"&per_page=100",timeout=25)
 media=json.loads(attached["payload"]) if attached.get("status")==200 else []
 urls=owned_candidates(item)
 owned=[]
 for m in media:
  if int(m.get("post") or 0)==sid:
   candidate=str(m.get("source_url") or "")
   if candidate.startswith(SOURCE+"/wp-content/uploads/") and candidate not in urls:
    urls.append(candidate)
   owned.append({"attachment_id":m.get("id"),"source_url":candidate,"alt":m.get("alt_text")})
 images=[]
 for url in urls[:12]:
  res=fetch(url)
  images.append({"url":url,**public(res),"png_dimensions":is_png(res)})
 record={"source_id":sid,"slug":item.get("slug"),"name":item.get("name"),
 "store_images":[{"id":x.get("id"),"src":x.get("src")} for x in (item.get("images") or [])],
 "owned_attachment_count":len(owned),"owned_attachments":owned,"description_or_owned_media":images}
 record["verified_owned_usable_count"]=sum(x.get("status")==200 and x.get("size",0)>512 for x in images)
 REPORT["products"].append(record)
 print("LIGHT_DIRECT_OWNER_MEDIA="+json.dumps(record,ensure_ascii=False),flush=True)
 save()

# Only use exact source URLs through documented image proxy path, no search-based product guesses.
for mid,path,dimensions in ORIGINALS:
 url=SOURCE+"/wp-content/uploads/"+path
 candidates=[
  ("WordPress Photon exact origin path","https://i0.wp.com/aquathanhxuan.com/wp-content/uploads/"+path),
  ("WordPress Photon alternative mirror","https://i1.wp.com/aquathanhxuan.com/wp-content/uploads/"+path),
  ("Origin www alias","https://www.aquathanhxuan.com/wp-content/uploads/"+path),
 ]
 tests=[]
 for label,target in candidates:
  r=fetch(target,timeout=14)
  dims=is_png(r)
  tests.append({"method":label,"url":target,**public(r),"png_dimensions":dims,
   "dimensions_match":dims==dimensions})
 # Internet Archive availability only; it doesn't authorize treating unrelated archived files as a source image.
 query=urllib.parse.quote(url,safe="")
 wayback=fetch("https://archive.org/wayback/available?url="+query,timeout=14,maxbytes=200000)
 snapshot=None
 if wayback.get("status")==200:
  try:
   data=json.loads(wayback["payload"])
   closest=data.get("archived_snapshots",{}).get("closest") or {}
   snapshot={"available":closest.get("available"),"url":closest.get("url"),"status":closest.get("status"),"timestamp":closest.get("timestamp")}
  except (ValueError,TypeError):snapshot={"error":"INVALID_WAYBACK_JSON"}
 item={"source_attachment_id":mid,"original":url,"expected_dimensions":dimensions,
 "candidate_checks":tests,"wayback_response_status":wayback.get("status"),"archive_snapshot":snapshot}
 REPORT["attachments"].append(item)
 print("LIGHT_EXACT_ATTACHMENT_ALTERNATIVES="+json.dumps(item,ensure_ascii=False),flush=True)
 save()
deferred_ids={1814,1815,1816,3052,3054,3056,3057,3058,3059,3060,3061,3062,3063}
catalog=fetch(SOURCE+"/wp-json/wc/store/v1/products?per_page=100&category=1546",timeout=40,maxbytes=6000000)
assert catalog.get("status")==200,"Source full light catalog unavailable"
root_products=json.loads(catalog["payload"])
assert isinstance(root_products,list) and len(root_products)==59,"Source root product count changed"
by_id={int(row["id"]):row for row in root_products}
assert deferred_ids.issubset(by_id),"Missing deferred Product from source root"
REPORT["deferred_product_taxonomy"]=[]
for sid in sorted(deferred_ids):
 row=by_id[sid]
 item={"source_id":sid,"slug":row.get("slug"),"name":row.get("name"),
 "categories":[{"id":c.get("id"),"name":c.get("name"),"slug":c.get("slug")} for c in row.get("categories") or []],
 "store_image_count":len(row.get("images") or [])}
 REPORT["deferred_product_taxonomy"].append(item)
 print("LIGHT_DEFERRED_SOURCE_TAXONOMY="+json.dumps(item,ensure_ascii=False),flush=True)
save()
REPORT["status"]="AUDIT_PASS"
save()
print("LIGHT_LAST_RESORT_READ_ONLY_PASS="+json.dumps({"products":len(REPORT["products"]),"attachments":len(REPORT["attachments"])}),flush=True)
