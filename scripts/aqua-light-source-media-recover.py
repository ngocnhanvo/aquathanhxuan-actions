#!/usr/bin/env python3
"""Strict read-after-write recovery of five source-light Products with no usable source cover.
Only exact, independently observed source Product IDs are allowed. Images are never fabricated.
"""
import html, http.cookiejar, json, os, re, urllib.error, urllib.parse, urllib.request
from pathlib import Path
from html.parser import HTMLParser

SRC='https://aquathanhxuan.com'
WP='https://admin.aquathanhxuan.io.vn'
EXPECTED={
  1815:None,
  3054:'Thiet-ke-chua-co-ten-2024-05-19T124426.236.png',
  3057:'Thiet-ke-chua-co-ten-2024-05-19T124426.236.png',
  3060:'Thiet-ke-chua-co-ten-2024-05-19T123505.164.png',
  3063:'Thiet-ke-chua-co-ten-2024-05-19T123505.164.png',
}
MAP={1546:1768,1525:1813,1482:1814,1545:1815,1526:1816,2175:1817,2176:1818,1524:1792}
out=Path('artifacts/aqua-light-media-recovery')
out.mkdir(parents=True,exist_ok=True)
report={'scope':list(EXPECTED),'records':[],'status':'STARTED','deferredMedia':[]}
def save():(out/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
save()
username=os.environ.get('WP_ADMIN_USERNAME','')
password=os.environ.get('WP_ADMIN_PASSWORD','')
assert username and password,'Missing WordPress CMS credentials'
env=dict(line.split('=',1) for line in os.environ.get('ENV_FILE','').splitlines() if '=' in line and not line.lstrip().startswith('#'))
assert env.get('WC_URL','').strip('"\\\'')==WP,'Wrong destination host'
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders=[('User-Agent','AquaLightMediaRecovery/1.0')]
def raw(url,method='GET',data=None,headers=None):
  req=urllib.request.Request(url,method=method,data=data,headers=headers or {})
  with opener.open(req,timeout=65) as res:return res.read()
def source(url):return json.loads(raw(SRC+url,headers={'Cache-Control':'no-cache'}).decode('utf-8'))
def norm(value):return ' '.join(html.unescape(re.sub(r'<[^>]*>',' ',str(value or ''))).casefold().split())
class Head(HTMLParser):
  def __init__(self):super().__init__();self.capture=False;self.title=[];self.desc=''
  def handle_starttag(self,tag,attrs):
    if tag=='title':self.capture=True
    if tag=='meta':
      d=dict(attrs)
      if str(d.get('name','')).lower()=='description':self.desc=str(d.get('content') or '').strip()
  def handle_data(self,d):
    if self.capture:self.title.append(d)
  def handle_endtag(self,tag):
    if tag=='title':self.capture=False
def image_unavailable(url):
  try:
    raw(url)
  except urllib.error.HTTPError as e:
    assert e.code==404,'Unexpected legacy image status '+str(e.code)+' '+url
    return True
  raise AssertionError('Legacy media exists now, do not create Product with empty image: '+url)
def category_root_membership():
  rows=[]
  for page in range(1,15):
    p=source('/wp-json/wc/store/v1/products?per_page=100&page='+str(page)+'&category=1546')
    rows.extend(p)
    if len(p)<100:break
  assert len(rows)==59,'Source Đèn root changed'
  return {int(p['id']) for p in rows}
scope=category_root_membership()
assert set(EXPECTED).issubset(scope),'Recovery requested Products not in verified Đèn root'
verified={}
for sid,failed_filename in EXPECTED.items():
  p=source('/wp-json/wc/store/v1/products/'+str(sid))
  assert int(p['id'])==sid and p['type']=='simple' and p.get('slug') and p.get('name'),'Source Product changed'
  images=p.get('images') or []
  if failed_filename is None:
    assert not images,'Source Product now has a cover image, cannot use blank-media exception'
    marker='NO_SOURCE_STORE_IMAGE:'+str(sid)
  else:
    assert images,'Image exception no longer matches'
    matched=[x for x in images if urllib.parse.unquote(str(x.get('src') or '').split('?')[0]).endswith('/'+failed_filename)]
    assert matched,'Expected source broken image is not attached to Product '+str(sid)
    for item in images:
      url=str(item.get('src') or '')
      assert url.startswith(SRC+'/wp-content/uploads/'),'Unexpected source media host'
      image_unavailable(url)
      if item.get('id'):
        try:
          media=source('/wp-json/wp/v2/media/'+str(item['id']))
        except urllib.error.HTTPError as e:
          assert e.code==404,'Source Media API failure '+str(e.code)
          media=None
        if media:
          for size in (media.get('media_details',{}).get('sizes') or {}).values():
            url2=str(size.get('source_url') or '')
            if url2.startswith(SRC+'/wp-content/uploads/'):
              image_unavailable(url2)
    marker=str(images[0].get('src') or '')
  prices=p.get('prices') or {}
  assert int(prices.get('currency_minor_unit',-1))==0
  current=str(prices.get('price') or '')
  reg=str(prices.get('regular_price') or '')
  assert current.isdigit() and reg.isdigit() and 0<=int(current)<=int(reg),'Source price changed'
  categories={int(c['id']) for c in p.get('categories') or []}
  # Source Woo term references map only into the independently verified eight Đèn taxonomy IDs.
  selected={MAP[c] for c in categories if c in MAP}
  selected.add(1768)
  assert selected.issubset(set(MAP.values())),'Unexpected target category selection'
  name=html.unescape(re.sub(r'<[^>]*>',' ',str(p['name']))).strip()
  head=Head();head.feed(raw(SRC+'/san-pham/'+urllib.parse.quote(p['slug'])+'/').decode('utf-8','replace').split('</head>',1)[0])
  title=html.unescape(' '.join(head.title).strip())
  desc=html.unescape(head.desc)
  description=str(p.get('description') or '')
  short=str(p.get('short_description') or '')
  assert SRC+'/wp-content/uploads/' not in description+short,'Media-rich description requires separate controlled localization '+str(sid)
  verified[sid]={'source':p,'name':name,'regular':reg,'price':current,
    'categories':sorted(selected),'deferred':marker,'description':description,'short':short,
    'seo_title':title,'seo_desc':desc}
  print('LIGHT_MEDIA_RECOVERY_SOURCE_PREFLIGHT='+json.dumps({'source_id':sid,'slug':p['slug'],'broken_media':marker,'categories':sorted(selected)},ensure_ascii=False),flush=True)

raw(WP+'/wp-login.php')
body=urllib.parse.urlencode({'log':username,'pwd':password,'wp-submit':'Log In','redirect_to':WP+'/wp-admin/','testcookie':'1'}).encode()
dash=raw(WP+'/wp-login.php','POST',body,{'Content-Type':'application/x-www-form-urlencoded'}).decode('utf-8','replace')
assert 'wp-admin-bar-my-account' in dash,'WP login failed'
nonce=''
m=re.search(r'wpApiSettings\\s*=\\s*(\\{.*?\\})\\s*;',dash,re.S)
if m:
  try:nonce=json.loads(m.group(1)).get('nonce','')
  except json.JSONDecodeError:pass
if not nonce:
  m=re.search(r'"nonce"\\s*:\\s*"([A-Za-z0-9]+)"',dash)
  nonce=m.group(1) if m else ''
assert nonce,'Missing WP REST nonce'
def api(path,method='GET',obj=None):
  headers={'X-WP-Nonce':nonce,'Accept':'application/json'}
  blob=None
  if obj is not None:
    headers['Content-Type']='application/json; charset=utf-8'
    blob=json.dumps(obj,ensure_ascii=False).encode('utf-8')
  return json.loads(raw(WP+path,method,blob,headers).decode('utf-8'))

for sid,data in verified.items():
  p=data['source']
  slug=p['slug']
  existing=api('/wp-json/wc/v3/products?status=any&per_page=100&slug='+urllib.parse.quote(slug))
  assert isinstance(existing,list) and len(existing)<=1,'Ambiguous destination Product slug'
  meta=[{'key':'_esc_origin_product_id','value':str(sid)},
        {'key':'product_lang','value':'vi'},
        {'key':'_esc_source_media_deferred','value':data['deferred']}]
  if data['seo_title']:meta.append({'key':'_yoast_wpseo_title','value':data['seo_title']})
  if data['seo_desc']:meta.append({'key':'_yoast_wpseo_metadesc','value':data['seo_desc']})
  fields={'name':data['name'],'slug':slug,'type':'simple','status':'publish',
    'catalog_visibility':'visible','description':data['description'],'short_description':data['short'],
    'regular_price':data['regular'],'manage_stock':False,
    'stock_status':'instock' if p.get('is_in_stock') else 'outofstock',
    'categories':[{'id':i} for i in data['categories']],
    'images':[],'meta_data':meta}
  if int(data['price'])<int(data['regular']):fields['sale_price']=data['price']
  if existing:
    previous=existing[0]
    assert norm(previous['name'])==norm(data['name']),'Another Product owns slug '+slug
    origin=[str(x.get('value')) for x in previous.get('meta_data') or [] if x.get('key')=='_esc_origin_product_id']
    assert not origin or origin==[str(sid)],'Origin Product ID conflict'
    pid=int(previous['id'])
    updates={}
    oldcats={int(x['id']) for x in previous.get('categories') or []}
    if not set(data['categories']).issubset(oldcats):
      updates['categories']=[{'id':i} for i in sorted(oldcats|set(data['categories']))]
    existing_keys={x.get('key') for x in previous.get('meta_data') or [] if str(x.get('value') or '').strip()}
    updates['meta_data']=[m for m in meta if m['key'] not in existing_keys]
    if not updates['meta_data']:del updates['meta_data']
    if not str(previous.get('description') or '').strip() and data['description']:updates['description']=data['description']
    if not str(previous.get('short_description') or '').strip() and data['short']:updates['short_description']=data['short']
    if updates:api('/wp-json/wc/v3/products/'+str(pid),'POST',updates)
    result='reused'
  else:
    created=api('/wp-json/wc/v3/products','POST',fields)
    pid=int(created['id'])
    assert pid>0,'Cannot create source Product'
    result='created'
  locale=api('/wp-json/wp/v2/product/'+str(pid)+'?context=edit')
  lang=(locale.get('acf') or {}).get('product_lang')
  if isinstance(lang,dict):lang=lang.get('value')
  if lang!='vi':api('/wp-json/wp/v2/product/'+str(pid),'POST',{'acf':{'product_lang':'vi'}})
  check=api('/wp-json/wc/v3/products/'+str(pid))
  assert check['slug']==slug and norm(check['name'])==norm(data['name'])
  assert str(check.get('price') or '')==data['price'] and str(check.get('regular_price') or '')==data['regular']
  assert set(data['categories']).issubset({int(x['id']) for x in check.get('categories') or []})
  metaCheck=check.get('meta_data') or []
  assert any(x.get('key')=='_esc_origin_product_id' and str(x.get('value'))==str(sid) for x in metaCheck)
  assert any(x.get('key')=='_esc_source_media_deferred' and str(x.get('value'))==data['deferred'] for x in metaCheck)
  assert not check.get('images'),'Source image remains missing, must not assign unrelated media'
  langCheck=api('/wp-json/wp/v2/product/'+str(pid)+'?context=edit')
  lang=(langCheck.get('acf') or {}).get('product_lang')
  if isinstance(lang,dict):lang=lang.get('value')
  assert lang=='vi'
  report['records'].append({'source_id':sid,'target_id':pid,'slug':slug,'status':result,'media_deferred':data['deferred']})
  report['deferredMedia'].append(sid)
  print('LIGHT_PRODUCT_MEDIA_DEFERRED_RECOVERED='+json.dumps(report['records'][-1],ensure_ascii=False),flush=True)
  save()
report['status']='PASS_WITH_SOURCE_MEDIA_DEFERRED'
save()
print('LIGHT_MEDIA_RECOVERY_PASS='+json.dumps({'count':len(report['records']),'source_ids':report['deferredMedia']},ensure_ascii=False),flush=True)
