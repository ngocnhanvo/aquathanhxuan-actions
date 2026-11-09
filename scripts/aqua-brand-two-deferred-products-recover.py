#!/usr/bin/env python3
"""Recover verified product records with an explicitly documented origin asset gap.

3178: source image and all sizes 404; publish original Product data without
invented imagery and mark its media deferred.
15280: source public detail displays 3 intact product gallery images. The Store
API includes an additional first image whose basename collides with unrelated
target Media, different SHA256. Do not overwrite or rename; link the three
images that are both source gallery and already copied with equal bytes.
"""
import hashlib
import html
import http.cookiejar
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

SOURCE='https://aquathanhxuan.com'
TARGET='https://admin.aquathanhxuan.io.vn'
USERNAME=os.environ.get('WP_ADMIN_USERNAME','')
PASSWORD=os.environ.get('WP_ADMIN_PASSWORD','')
assert USERNAME and PASSWORD,'Missing WP login'
env=dict(x for x in (
 tuple(line.split('=',1)) for line in os.environ.get('ENV_FILE','').splitlines()
 if '=' in line and not line.lstrip().startswith('#')
) if len(x)==2)
assert env.get('WC_URL','').strip('"\'')==TARGET,'Wrong CMS origin'
STALE_MEDIA={
  3178:'https://aquathanhxuan.com/wp-content/uploads/2017/10/Thiet-ke-chua-co-ten-2024-05-19T115829.070.png',
  15280:'https://aquathanhxuan.com/wp-content/uploads/2020/08/Thiet-ke-chua-co-ten-34.png'
}
PRODUCTS={
  3178: {'slug':'su-ista-active-bio-pearl','source_category':2158,'dest_category':1798,'images':[]},
  15280:{'slug':'bom-jecod-fa-1000','source_category':2161,'dest_category':1806,'images':[
    ('62.png',82867),
    ('Thiet-ke-chua-co-ten-2024-05-18T153204.687.png',82866),
    ('Thiet-ke-chua-co-ten-2024-05-18T153852.528.png',82869),
  ]}
}
assert len(PRODUCTS)==2
out=Path('artifacts/aqua-brand-media-recovery')
out.mkdir(parents=True,exist_ok=True)
journal={'scope':[3178,15280],'status':'STARTED','records':[],'source_media_deferred':[{
  'source_product_id':3178,'url':STALE_MEDIA[3178],'reason':'HTTP404_ALL_SOURCE_SIZES'},
  {'source_product_id':15280,'url':STALE_MEDIA[15280],'reason':'SAME_FILENAME_DIFFERENT_BYTES_TARGET; LEGACY_DETAIL_ONLY_RENDERS_3_OTHER_IMAGES'}
]}
def save(): (out/'result.json').write_text(json.dumps(journal,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
save()
cookies=http.cookiejar.CookieJar()
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
opener.addheaders=[('User-Agent','AquaBrandTwoRecordsRecovery/1.0')]

def request(url,method='GET',data=None,headers=None,timeout=45):
  req=urllib.request.Request(url,data=data,method=method,headers=headers or {})
  return opener.open(req,timeout=timeout)
def raw(url):
  with request(url,headers={'Cache-Control':'no-cache'}) as r:return r.read()
def getjson(url):return json.loads(raw(url).decode('utf-8'))
def norm(value):
  return ' '.join(html.unescape(re.sub('<[^>]+>',' ',str(value or ''))).casefold().split())
class SEO(HTMLParser):
  def __init__(self):
    super().__init__();self.title=[];self.is_title=False;self.description=''
  def handle_starttag(self,tag,attrs):
    if tag=='title':self.is_title=True
    if tag=='meta':
      d=dict(attrs)
      if str(d.get('name','')).lower()=='description':self.description=str(d.get('content') or '').strip()
  def handle_endtag(self,tag):
    if tag=='title':self.is_title=False
  def handle_data(self,data):
    if self.is_title:self.title.append(data)

def source_meta(slug):
  head=raw(SOURCE+'/san-pham/'+urllib.parse.quote(slug)+'/').decode('utf-8','replace').split('</head>',1)[0]
  parser=SEO();parser.feed(head)
  return html.unescape(' '.join(parser.title).strip()),html.unescape(parser.description)

# Strictly verify both original Woo Products and their immutable mapping.
sources={}
for sid,entry in PRODUCTS.items():
  p=getjson(SOURCE+'/wp-json/wc/store/v1/products/'+str(sid))
  assert int(p.get('id') or 0)==sid and p.get('slug')==entry['slug'],'Original identity changed'
  assert p.get('type')=='simple' and any(int(c['id'])==entry['source_category'] for c in p.get('categories') or []),'Source taxonomy/type changed'
  assert isinstance(p.get('is_in_stock'),bool),'Source stock unknown'
  prices=p.get('prices') or {}
  assert int(prices.get('currency_minor_unit',-1))==0,'Source price precision changed'
  assert str(prices.get('price') or '').isdigit() and str(prices.get('regular_price') or '').isdigit(),'Price data missing'
  assert 0<=int(prices['price'])<=int(prices['regular_price']),'Invalid source prices'
  images=p.get('images') or []
  assert images,'Source product has no media identity'
  assert images[0]['src']==STALE_MEDIA[sid],'Source gallery changed; do not apply exception'
  sources[sid]=p

# Verify the original ISTA image does not exist, not merely that our source crawler failed.
try:
  response=request(STALE_MEDIA[3178]);response.close()
  raise AssertionError('ISTA source image has recovered — do not use missing-image exception')
except urllib.error.HTTPError as e:
  assert e.code==404,'ISTA source image error changed from 404 to '+str(e.code)

# Prove the store-only extra photo is different from the already stored filename,
# so it must never be assigned to JECOD or overwrite the existing image.
legacy_extra=raw(STALE_MEDIA[15280])
assert hashlib.sha256(legacy_extra).hexdigest()=='319a6e5c6fa50eb1da27fb2e218eea2f6908f479d1975f601bc9921003711340','JECOD source extra image changed'
local_collision=raw(TARGET+'/wp-content/uploads/2026/11/Thiet-ke-chua-co-ten-34.png')
assert hashlib.sha256(local_collision).hexdigest()!=hashlib.sha256(legacy_extra).hexdigest(),'JECOD media collision has changed; re-inspect'

# Source storefront HTML for JECOD uses image 62.png as first displayed gallery image.
legacy_detail=raw(SOURCE+'/san-pham/bom-jecod-fa-1000/').decode('utf-8','replace')
assert 'src="'+SOURCE+'/wp-content/uploads/2020/08/62.png"' in legacy_detail,'Legacy JECOD detail gallery changed'
gallery=PRODUCTS[15280]['images']
assert len(sources[15280]['images'])==4 and len(gallery)==3,'Unexpected source gallery count'
for (filename,_) , item in zip(gallery,sources[15280]['images'][1:]):
  assert str(item['src']).endswith('/'+filename),'JECOD source gallery changed'

request(TARGET+'/wp-login.php').read()
login=urllib.parse.urlencode({'log':USERNAME,'pwd':PASSWORD,'wp-submit':'Log In',
  'redirect_to':TARGET+'/wp-admin/','testcookie':'1'}).encode()
dash=request(TARGET+'/wp-login.php','POST',login,{'Content-Type':'application/x-www-form-urlencoded'}).read().decode('utf-8','replace')
assert 'wp-admin-bar-my-account' in dash,'WordPress login invalid'
nonce=''
m=re.search(r'wpApiSettings\s*=\s*(\{.*?\})\s*;',dash,re.S)
if m:
  try:nonce=json.loads(m.group(1)).get('nonce','')
  except json.JSONDecodeError:pass
if not nonce:
  m=re.search(r'"nonce"\s*:\s*"([A-Za-z0-9]+)"',dash)
  nonce=m.group(1) if m else ''
assert nonce,'WP REST nonce missing'
def api(path,method='GET',data=None):
  headers={'X-WP-Nonce':nonce,'Accept':'application/json'}
  raw_data=None
  if data is not None:
    headers['Content-Type']='application/json; charset=utf-8'
    raw_data=json.dumps(data,ensure_ascii=False).encode('utf-8')
  with request(TARGET+path,method,raw_data,headers,70) as r:
    body=r.read()
  return json.loads(body.decode('utf-8')) if body else None

cats=api('/wp-json/wc/v3/products/categories?per_page=100')
for sid,entry in PRODUCTS.items():
  matches=[c for c in cats if int(c['id'])==entry['dest_category']]
  assert len(matches)==1 and int(matches[0].get('parent') or 0)==1767,'Destination category ownership changed'
  assert norm(matches[0].get('name'))==('ista' if sid==3178 else 'jecod'),'Brand name changed'
media_ids=[]
for filename,mid in gallery:
  target_media=api('/wp-json/wp/v2/media/'+str(mid)+'?context=edit')
  local_url=urllib.parse.urljoin(TARGET+'/',str(target_media['source_url']))
  original_url=SOURCE+'/wp-content/uploads/2020/08/'+filename
  assert local_url.endswith('/'+filename) and local_url.startswith(TARGET+'/wp-content/uploads/'),'Media filename changed'
  original=raw(original_url)
  mirror=raw(local_url)
  assert hashlib.sha256(original).digest()==hashlib.sha256(mirror).digest(),'Incorrect content for existing JECOD Media '+filename
  media_ids.append(mid)
print('BRAND_TWO_PRODUCTS_MEDIA_PREFLIGHT='+json.dumps({'isto_source_404':True,'jecod_3_gallery_media_verified':media_ids}),flush=True)

for sid,entry in PRODUCTS.items():
  source=sources[sid]
  slug=entry['slug']
  seo_title,seo_desc=source_meta(slug)
  title=html.unescape(re.sub('<[^>]+>',' ',str(source['name']))).strip()
  p=source['prices']
  regular=str(p['regular_price'])
  current=str(p['price'])
  existing=api('/wp-json/wc/v3/products?status=any&per_page=100&slug='+urllib.parse.quote(slug))
  assert isinstance(existing,list) and len(existing)<=1,'Ambiguous destination slug'
  media=[{'id':mid,'alt':title} for mid in media_ids] if sid==15280 else []
  origin_meta=[
    {'key':'_esc_origin_product_id','value':str(sid)},
    {'key':'product_lang','value':'vi'},
    {'key':'_esc_source_media_deferred','value':STALE_MEDIA[sid]},
  ]
  if seo_title:origin_meta.append({'key':'_yoast_wpseo_title','value':seo_title})
  if seo_desc:origin_meta.append({'key':'_yoast_wpseo_metadesc','value':seo_desc})
  data={
    'name':title,'slug':slug,'type':'simple','status':'publish','catalog_visibility':'visible',
    'description':str(source.get('description') or ''),
    'short_description':str(source.get('short_description') or ''),
    'regular_price':regular,'manage_stock':False,
    'stock_status':'instock' if source['is_in_stock'] else 'outofstock',
    'categories':[{'id':entry['dest_category']}],
    'images':media,'meta_data':origin_meta
  }
  if int(current)<int(regular):data['sale_price']=current
  assert not re.search(r'https?://aquathanhxuan\.com/wp-content/uploads/',data['description']+data['short_description'],re.I),'Source media hotlink in original content'
  if existing:
    old=existing[0]
    assert norm(old.get('name'))==norm(title),'Existing slug points to different product'
    origin=(next((str(x.get('value')) for x in old.get('meta_data') or [] if x.get('key')=='_esc_origin_product_id'),None))
    assert not origin or origin==str(sid),'Destination slug belongs to another legacy product'
    tid=int(old['id'])
    assert set([entry['dest_category']]).issubset({int(c['id']) for c in old.get('categories') or []}),'Existing target category membership missing'
    if len(old.get('images') or [])==0 and media:
      api('/wp-json/wc/v3/products/'+str(tid),'POST',{'images':media})
    status='reused'
  else:
    dest=api('/wp-json/wc/v3/products','POST',data)
    assert int(dest.get('id') or 0)>0,'Product creation failed '+slug
    tid=int(dest['id'])
    status='created'
  wp=api('/wp-json/wp/v2/product/'+str(tid)+'?context=edit')
  lang=(wp.get('acf') or {}).get('product_lang')
  if isinstance(lang,dict):lang=lang.get('value')
  if lang!='vi':
    api('/wp-json/wp/v2/product/'+str(tid),'POST',{'acf':{'product_lang':'vi'}})
    wp=api('/wp-json/wp/v2/product/'+str(tid)+'?context=edit')
    lang=(wp.get('acf') or {}).get('product_lang')
    if isinstance(lang,dict):lang=lang.get('value')
    assert lang=='vi','Cannot persist Vietnamese ACF locale '+slug
  verify=api('/wp-json/wc/v3/products/'+str(tid))
  assert verify['slug']==slug and norm(verify['name'])==norm(title)
  assert int(verify['categories'][0]['id'])==entry['dest_category']
  assert str(verify.get('price') or '')==current and str(verify.get('regular_price') or '')==regular,'Source price changed'
  if sid==15280:
    assert [int(i['id']) for i in verify['images']][:3]==media_ids,'JECOD source detail gallery mismatch'
  else:assert len(verify.get('images') or [])==0,'Broken-source ISTA media was wrongly replaced'
  journal['records'].append({'source_id':sid,'target_id':tid,'slug':slug,'status':status,
    'gallery_images':len(media),'media_source_status':'SOURCE_IMAGE_MISSING' if sid==3178 else 'SOURCE_STOREFRONT_GALLERY_MATCH'})
  save()
  print('BRAND_RECOVERED_PRODUCT='+json.dumps(journal['records'][-1],ensure_ascii=False),flush=True)

assert len(journal['records'])==2
journal['status']='PRODUCT_IDENTITIES_PASS__SOURCE_ISTA_IMAGE_DEFERRED'
journal['finished_at']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
save()
print('BRAND_RECOVERY_RECORDS_PASS='+json.dumps({'products':2,'source_image_deferred':1,'collision_disallowed':1},ensure_ascii=False),flush=True)
