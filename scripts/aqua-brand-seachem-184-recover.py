#!/usr/bin/env python3
"""Strictly scoped recovery for public Seachem Product 184 with missing source image.

Source attachment 266903 and every public derivative return HTTP 404;
no invented/hotlinked image is published. All other Product fields are original.
"""
import html
import http.cookiejar
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
SRC='https://aquathanhxuan.com'
WP='https://admin.aquathanhxuan.io.vn'
SOURCE_ID=184
SOURCE_SLUG='seachem-matrix-0-5'
SOURCE_CATEGORY=193
TARGET_CATEGORY=1804
BAD_IMAGE=SRC+'/wp-content/uploads/2017/06/Thiet-ke-chua-co-ten-2024-05-20T220456.211.png'
RESULT=Path('artifacts/aqua-brand-seachem-184')
RESULT.mkdir(parents=True,exist_ok=True)
def save(data):
  (RESULT/'result.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
report={'source_id':SOURCE_ID,'source_slug':SOURCE_SLUG,'status':'STARTED','media_exception':'SOURCE_IMAGE_AND_ALL_DERIVATIVES_HTTP_404'}
save(report)
username=os.environ.get('WP_ADMIN_USERNAME')
password=os.environ.get('WP_ADMIN_PASSWORD')
assert username and password,'Missing authenticated WordPress editor'
env=dict(x for x in (
  tuple(line.split('=',1)) for line in os.environ.get('ENV_FILE','').splitlines()
  if '=' in line and not line.lstrip().startswith('#')
) if len(x)==2)
assert env.get('WC_URL','').strip('"\'')==WP,'Wrong CMS target'
cookies=http.cookiejar.CookieJar()
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
opener.addheaders=[('User-Agent','AquaSeachem184VerifiedRecovery/1.0')]
def get(url,method='GET',data=None,headers=None,timeout=40):
  req=urllib.request.Request(url,method=method,data=data,headers=headers or {})
  with opener.open(req,timeout=timeout) as res:return res.read()
def source(url):
  return json.loads(get(url,headers={'Cache-Control':'no-cache'}).decode('utf-8'))
def norm(value):
  return ' '.join(html.unescape(re.sub(r'<[^>]*>',' ',str(value or ''))).casefold().split())
class Head(HTMLParser):
  def __init__(self):super().__init__();self.capture=False;self.title=[];self.desc=''
  def handle_starttag(self,tag,attrs):
    if tag=='title':self.capture=True
    if tag=='meta':
      x=dict(attrs)
      if str(x.get('name','')).lower()=='description':self.desc=str(x.get('content') or '').strip()
  def handle_data(self,d):
    if self.capture:self.title.append(d)
  def handle_endtag(self,tag):
    if tag=='title':self.capture=False

p=source(SRC+'/wp-json/wc/store/v1/products/'+str(SOURCE_ID))
assert int(p.get('id') or 0)==SOURCE_ID and p.get('slug')==SOURCE_SLUG,'Unexpected source Product identity'
assert p.get('type')=='simple','Product source type changed'
assert any(int(c.get('id') or 0)==SOURCE_CATEGORY for c in p.get('categories') or []),'Source Seachem category changed'
assert isinstance(p.get('is_in_stock'),bool)
prices=p.get('prices') or {}
assert int(prices.get('currency_minor_unit',-1))==0
reg=str(prices.get('regular_price') or '')
current=str(prices.get('price') or '')
assert reg.isdigit() and current.isdigit() and 0<=int(current)<=int(reg),'Unexpected source Woo price'
images=p.get('images') or []
assert len(images)==2 and all(int(i.get('id') or 0)==266903 and i.get('src')==BAD_IMAGE for i in images),'Unexpected source image state'
# This product has no valid original photo: fail if it recovers rather than publishing an inaccurate exception.
for suffix in ['','-300x199','-1024x678','-768x509','-600x398','-300x300','-150x150','-100x100']:
  url=BAD_IMAGE.replace('.png',suffix+'.png')
  try:
    get(url,timeout=18)
  except urllib.error.HTTPError as e:
    assert e.code==404,'Image source changed HTTP '+str(e.code)+' '+url
  else:raise AssertionError('Original image recovered, use ordinary migration instead of empty-media exception '+url)
head=Head()
head.feed(get(SRC+'/san-pham/'+SOURCE_SLUG+'/').decode('utf-8','replace').split('</head>',1)[0])
seo_title=html.unescape(' '.join(head.title).strip())
seo_desc=html.unescape(head.desc)
name=html.unescape(re.sub(r'<[^>]+>',' ',str(p.get('name') or ''))).strip()
assert name and norm(name)==norm('Seachem Matrix 1lit (lẻ)'),'Source name changed'
description=str(p.get('description') or '')
short_description=str(p.get('short_description') or '')
# Do not silently preserve legacy media hotlinks in the new CMS.
assert SRC+'/wp-content/uploads/' not in description+short_description,'Source description contains legacy media requiring localization'
get(WP+'/wp-login.php')
params=urllib.parse.urlencode({'log':username,'pwd':password,'wp-submit':'Log In',
 'redirect_to':WP+'/wp-admin/','testcookie':'1'}).encode()
dash=get(WP+'/wp-login.php','POST',params,{'Content-Type':'application/x-www-form-urlencoded'}).decode('utf-8','replace')
assert 'wp-admin-bar-my-account' in dash,'CMS login failed'
nonce=''
m=re.search(r'wpApiSettings\s*=\s*(\{.*?\})\s*;',dash,re.S)
if m:
  try:nonce=json.loads(m.group(1)).get('nonce','')
  except json.JSONDecodeError:pass
if not nonce:
  n=re.search(r'"nonce"\s*:\s*"([A-Za-z0-9]+)"',dash)
  nonce=n.group(1) if n else ''
assert nonce,'Missing WP REST nonce'
def api(path,method='GET',body=None):
  headers={'X-WP-Nonce':nonce,'Accept':'application/json'}
  blob=None
  if body is not None:
    blob=json.dumps(body,ensure_ascii=False).encode('utf-8')
    headers['Content-Type']='application/json; charset=utf-8'
  return json.loads(get(WP+path,method,blob,headers,timeout=70).decode('utf-8'))

cats=api('/wp-json/wc/v3/products/categories?per_page=100')
c=[x for x in cats if int(x['id'])==TARGET_CATEGORY]
assert len(c)==1 and norm(c[0]['name'])=='seachem' and int(c[0]['parent'])==1767
existing=api('/wp-json/wc/v3/products?status=any&per_page=100&slug='+urllib.parse.quote(SOURCE_SLUG))
assert isinstance(existing,list) and len(existing)<=1,'Ambiguous target Product slug'
meta=[{'key':'_esc_origin_product_id','value':str(SOURCE_ID)},
      {'key':'product_lang','value':'vi'},
      {'key':'_esc_source_media_deferred','value':BAD_IMAGE}]
if seo_title:meta.append({'key':'_yoast_wpseo_title','value':seo_title})
if seo_desc:meta.append({'key':'_yoast_wpseo_metadesc','value':seo_desc})
fields={'name':name,'slug':SOURCE_SLUG,'type':'simple','status':'publish',
        'catalog_visibility':'visible','description':description,'short_description':short_description,
        'regular_price':reg,'manage_stock':False,
        'stock_status':'instock' if p['is_in_stock'] else 'outofstock',
        'categories':[{'id':TARGET_CATEGORY}],'images':[],'meta_data':meta}
if int(current)<int(reg):fields['sale_price']=current
if existing:
  previous=existing[0]
  assert norm(previous['name'])==norm(name),'Slug belongs to unrelated Product'
  origin=[str(x.get('value')) for x in previous.get('meta_data') or [] if x.get('key')=='_esc_origin_product_id']
  assert not origin or origin==[str(SOURCE_ID)],'Original source ID conflict'
  pid=int(previous['id'])
  status='reused'
else:
  made=api('/wp-json/wc/v3/products','POST',fields)
  pid=int(made['id'])
  assert pid>0,'Cannot create Product'
  status='created'
wp=api('/wp-json/wp/v2/product/'+str(pid)+'?context=edit')
lang=(wp.get('acf') or {}).get('product_lang')
if isinstance(lang,dict):lang=lang.get('value')
if lang!='vi':api('/wp-json/wp/v2/product/'+str(pid),'POST',{'acf':{'product_lang':'vi'}})
verify=api('/wp-json/wc/v3/products/'+str(pid))
assert verify['slug']==SOURCE_SLUG and norm(verify['name'])==norm(name)
assert str(verify.get('price') or '')==current and str(verify.get('regular_price') or '')==reg
assert {int(x['id']) for x in verify.get('categories') or []}>={TARGET_CATEGORY}
assert not verify.get('images'),'Do not invent the missing source Product image'
fields_meta=verify.get('meta_data') or []
assert any(x.get('key')=='_esc_origin_product_id' and str(x.get('value'))==str(SOURCE_ID) for x in fields_meta)
assert any(x.get('key')=='_esc_source_media_deferred' and str(x.get('value'))==BAD_IMAGE for x in fields_meta)
if seo_title:assert any(x.get('key')=='_yoast_wpseo_title' and str(x.get('value') or '').strip() for x in fields_meta)
if seo_desc:assert any(x.get('key')=='_yoast_wpseo_metadesc' and str(x.get('value') or '').strip() for x in fields_meta)
acf=api('/wp-json/wp/v2/product/'+str(pid)+'?context=edit')
l=(acf.get('acf') or {}).get('product_lang')
if isinstance(l,dict):l=l.get('value')
assert l=='vi'
report.update(status='PASS_WITH_SOURCE_IMAGE_DEFERRED',sourceId=SOURCE_ID,targetId=pid,result=status,price=current,
              seoTitle=bool(seo_title),seoDescription=bool(seo_desc),missingMediaSource=BAD_IMAGE)
save(report)
print('BRAND_SEACHEM_184_RECOVERED='+json.dumps(report,ensure_ascii=False),flush=True)
