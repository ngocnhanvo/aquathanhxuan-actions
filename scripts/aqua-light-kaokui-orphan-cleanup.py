#!/usr/bin/env python3
"""Remove only the VERIFIED renamed orphan uploaded by the failed light Product 350144 import.

The previous runner logged WordPress auto-renamed kaokui2-300x300.jpg on
2026-11-09 14:21:32 UTC. Before deleting, recheck source bytes, target
upload date, unattached status and absence of the scoped Product.
"""
import hashlib,http.cookiejar,json,os,urllib.parse,urllib.request
from pathlib import Path

SOURCE='https://aquathanhxuan.com'
TARGET='https://admin.aquathanhxuan.io.vn'
PRODUCT_ID=350144
SLUG='den-kaokui-70w-pro-2'
ORIGINAL='kaokui2-300x300.jpg'
RENAMED='kaokui2-300x300-1.jpg'
OUT=Path('artifacts/aqua-light-kaokui')
OUT.mkdir(parents=True,exist_ok=True)
report={'source_id':PRODUCT_ID,'slug':SLUG,'status':'STARTED','removed_ids':[]}
def save():(OUT/'cleanup.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
save()
env=dict(line.split('=',1) for line in os.environ.get('ENV_FILE','').splitlines() if '=' in line and not line.lstrip().startswith('#'))
assert env.get('WC_URL','').strip('"\\\'')==TARGET,'Wrong WordPress host'
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders=[('User-Agent','AquaLightOrphanCleanup/1.0')]
def raw(url,method='GET',data=None,headers=None):
    with opener.open(urllib.request.Request(url,data=data,method=method,headers=headers or {}),timeout=70) as r:return r.read()
src=json.loads(raw(SOURCE+'/wp-json/wc/store/v1/products/'+str(PRODUCT_ID)))
assert int(src['id'])==PRODUCT_ID and src['slug']==SLUG and src['type']=='simple'
image_urls=[str(x.get('src') or '') for x in src.get('images') or []]
source_original=[x for x in image_urls if urllib.parse.urlparse(x).path.endswith('/'+ORIGINAL)]
assert len(source_original)==1,'Source product original image not unique'
source_sha=hashlib.sha256(raw(source_original[0])).hexdigest()
raw(TARGET+'/wp-login.php')
username=os.environ['WP_ADMIN_USERNAME'];password=os.environ['WP_ADMIN_PASSWORD']
body=urllib.parse.urlencode({'log':username,'pwd':password,'wp-submit':'Log In','redirect_to':TARGET+'/wp-admin/','testcookie':'1'}).encode()
dash=raw(TARGET+'/wp-login.php','POST',body,{'Content-Type':'application/x-www-form-urlencoded'}).decode('utf-8','replace')
assert 'wp-admin-bar-my-account' in dash,'WP auth denied'
import re
m=re.search(r'wpApiSettings\\s*=\\s*(\\{.*?\\})\\s*;',dash,re.S)
nonce=''
if m:
    try:nonce=json.loads(m.group(1)).get('nonce','')
    except json.JSONDecodeError:pass
if not nonce:
    m=re.search(r'"nonce"\\s*:\\s*"([A-Za-z0-9]+)"',dash)
    nonce=m.group(1) if m else ''
assert nonce,'Missing WP nonce'
def api(url,method='GET'):
    return json.loads(raw(TARGET+url,method,headers={'X-WP-Nonce':nonce,'Accept':'application/json'}))
items=api('/wp-json/wc/v3/products?status=any&per_page=100&slug='+SLUG)
assert not items,'Product exists, do not clean up images used by commerce'
found=api('/wp-json/wp/v2/media?context=edit&per_page=100&search=kaokui2-300x300')
candidates=[x for x in found if urllib.parse.urlparse(str(x.get('source_url') or '')).path.endswith('/'+RENAMED)]
assert len(candidates)<=1,'Ambiguous renamed orphan'
for asset in candidates:
    media_id=int(asset['id'])
    assert media_id>0 and int(asset.get('post') or 0)==0,'Media has been linked to content'
    timestamp=str(asset.get('date_gmt') or asset.get('date') or '')
    assert '2026-11-09T14:20:'<=timestamp<='2026-11-09T14:23:59','Media creation outside failed run window'
    path=urllib.parse.urlparse(str(asset.get('source_url') or '')).path
    assert path.startswith('/wp-content/uploads/'),'Not target media'
    target_sha=hashlib.sha256(raw(TARGET+path)).hexdigest()
    assert target_sha==source_sha,'Renamed media bytes do not match exact source Product'
    deleted=api('/wp-json/wp/v2/media/'+str(media_id)+'?force=true',method='DELETE')
    assert deleted.get('deleted') is True,'WordPress did not acknowledge deletion'
    report['removed_ids'].append(media_id)
    print('LIGHT_SCOPED_ORPHAN_CLEANUP_PASS='+json.dumps({'media_id':media_id,'source_sha256':source_sha}),flush=True)
report['status']='PASS'
save()
print('LIGHT_ORPHAN_CLEANUP_COMPLETE='+json.dumps(report,ensure_ascii=False),flush=True)
