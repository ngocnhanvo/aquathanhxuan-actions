#!/usr/bin/env python3
"""Import only 10 verified legacy storefront products. No invented price, title or media."""
import hashlib, html, http.cookiejar, json, mimetypes, os, re, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

SOURCE = 'https://aquathanhxuan.com'
DEST = 'https://admin.aquathanhxuan.io.vn'
NAMES = [
    'LED rọi Kaokui KK-F06',
    'Chân gỗ 40x40x70',
    'Bể cubic 40 siêu trong',
    'Máy Lọc Treo Xiaoli Sunsun XBL 500',
]
USERNAME=os.environ.get('WP_ADMIN_USERNAME','')
PASSWORD=os.environ.get('WP_ADMIN_PASSWORD','')
assert USERNAME and PASSWORD, 'WordPress credentials unavailable'
env=dict(item for item in (
  tuple(line.split('=',1)) for line in os.environ.get('ENV_FILE','').splitlines()
  if '=' in line and not line.lstrip().startswith('#')
) if len(item)==2)
assert env.get('WC_URL','').strip('"\'')==DEST,'Destination origin mismatch'
cookies=http.cookiejar.CookieJar()
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
opener.addheaders=[('User-Agent','AquaHotComboVerifiedImporter/1.0')]

def request(url,method='GET',data=None,headers=None,timeout=70):
  req=urllib.request.Request(url,data=data,method=method,headers=headers or {})
  try: return opener.open(req,timeout=timeout)
  except urllib.error.HTTPError as e:
    body=e.read().decode('utf-8','replace')
    raise RuntimeError(f'HTTP {e.code} {url}: {body[:500]}') from e

def public(url):
  with request(url,headers={'Cache-Control':'no-cache'}) as r:
    return json.loads(r.read().decode('utf-8'))

def normalize(value):
  return ' '.join(html.unescape(re.sub(r'<[^>]*>',' ',str(value or ''))).strip().casefold().split())

# Inventory exactly the four products shown inside the original Hot Combo.
# Search by title, then pin ID, slug, price, image, and type for the importer.
found, missing = [], []
for wanted in NAMES:
  matches=[]
  for query in [' '.join(wanted.split()[:3]), ' '.join(wanted.split()[-3:])]:
    search=SOURCE+'/wp-json/wc/store/v1/products?per_page=100&search='+urllib.parse.quote(query)
    records=public(search)
    assert isinstance(records,list),'Legacy Woo API unexpectedly returned non-list'
    matches=[x for x in records if normalize(x.get('name'))==normalize(wanted)]
    assert len(matches)<=1,'Ambiguous origin product: '+wanted
    if matches: break
  if not matches: missing.append(wanted); continue
  p=matches[0]
  image=next((i.get('src') for i in (p.get('images') or []) if i.get('src')),None)
  found.append({'id':p['id'],'name':p['name'],'slug':p['slug'],
    'price':p['prices']['price'],'regular_price':p['prices']['regular_price'],
    'image':image})
assert not missing,'Legacy products missing: '+', '.join(missing)
assert len(found)==len(NAMES),'Partial origin inventory'
EXPECTED={'found':found}
print('HOT_COMBO_ORIGIN='+json.dumps(found,ensure_ascii=False),flush=True)

# Read the actual origin records immediately before any destination writes.
verified=[]
for expected in EXPECTED['found']:
  source=public(SOURCE+'/wp-json/wc/store/v1/products/'+str(expected['id']))
  assert int(source.get('id',0))==int(expected['id']), 'Source ID changed'
  assert normalize(source.get('name'))==normalize(expected['name']), 'Source name changed'
  assert source.get('slug')==expected['slug'], 'Source slug changed'
  assert source.get('type')=='simple', 'Only source simple products permitted'
  prices=source.get('prices') or {}
  assert int(prices.get('currency_minor_unit',-1))==0, 'Unexpected currency precision'
  assert prices.get('price')==expected['price'],'Source current price changed'
  assert prices.get('regular_price')==expected['regular_price'],'Source regular price changed'
  image=next((x for x in source.get('images') or [] if x.get('src')),None)
  assert image and image['src']==expected['image'],'Origin image changed/missing'
  assert isinstance(source.get('is_in_stock'),bool),'Origin stock status missing'
  verified.append((source,image))
print('HOT_COMBO_ORIGIN_RECORDS_VERIFIED='+str(len(verified)),flush=True)

request(DEST+'/wp-login.php').read()
payload=urllib.parse.urlencode({'log':USERNAME,'pwd':PASSWORD,'wp-submit':'Log In',
  'redirect_to':DEST+'/wp-admin/','testcookie':'1'}).encode()
dashboard=request(DEST+'/wp-login.php',method='POST',data=payload,
 headers={'Content-Type':'application/x-www-form-urlencoded'}).read().decode('utf-8','replace')
assert 'wp-admin-bar-my-account' in dashboard, 'WP admin login failed'
nonce=''
match=re.search(r'wpApiSettings\s*=\s*(\{.*?\})\s*;',dashboard,re.S)
if match:
  try: nonce=json.loads(match.group(1)).get('nonce','')
  except json.JSONDecodeError: pass
if not nonce:
  m=re.search(r'"nonce"\s*:\s*"([A-Za-z0-9]+)"',dashboard)
  nonce=m.group(1) if m else ''
assert nonce, 'Missing WP REST nonce'

def api(path,method='GET',obj=None,raw=None,headers=None):
  hdr={'X-WP-Nonce':nonce,'Accept':'application/json'}
  if headers: hdr.update(headers)
  if obj is not None:
    raw=json.dumps(obj,ensure_ascii=False).encode()
    hdr['Content-Type']='application/json; charset=utf-8'
  with request(DEST+path,method=method,data=raw,headers=hdr) as response:
    content=response.read()
  return json.loads(content.decode('utf-8')) if content else None

def retrieve_bytes(url):
  error=None
  for attempt in range(4): # one initial attempt + max three retries
    try:
      with request(url) as response: data=response.read()
      assert data, 'empty image'
      return data
    except Exception as e:
      error=e
      if attempt<3: time.sleep(1+attempt)
  raise RuntimeError(f'ASSET_DEFERRED url={url}: {error}')

def ensure_media(source_image,alt):
  uri=source_image['src']
  filename=os.path.basename(urllib.parse.unquote(urllib.parse.urlparse(uri).path))
  assert filename and '"' not in filename and '/' not in filename, 'Invalid source filename'
  original=retrieve_bytes(uri)
  digest=hashlib.sha256(original).hexdigest()
  stem=os.path.splitext(filename)[0]
  found=api('/wp-json/wp/v2/media?context=edit&per_page=100&search='+urllib.parse.quote(stem))
  for item in found if isinstance(found,list) else []:
    existing=os.path.basename(urllib.parse.unquote(urllib.parse.urlparse(item.get('source_url','')).path))
    if existing!=filename: continue
    actual=retrieve_bytes(urllib.parse.urljoin(DEST+'/',item['source_url']))
    assert hashlib.sha256(actual).hexdigest()==digest, 'Same filename but DIFFERENT image: '+filename
    return int(item['id'])
  media=api('/wp-json/wp/v2/media',method='POST',raw=original,headers={
    'Content-Type':mimetypes.guess_type(filename)[0] or 'application/octet-stream',
    'Content-Disposition':'attachment; filename="'+filename+'"'
  })
  created=int(media['id'])
  actual=os.path.basename(urllib.parse.unquote(urllib.parse.urlparse(media.get('source_url','')).path))
  assert actual==filename, 'Image filename was changed by WordPress'
  api('/wp-json/wp/v2/media/'+str(created),method='POST',obj={'alt_text':alt})
  return created

mappings=[]
for source,image in verified:
  source_id=int(source['id'])
  name=html.unescape(re.sub(r'<[^>]+>',' ',str(source['name']))).strip()
  slug=source['slug']
  candidates=api('/wp-json/wc/v3/products?status=any&per_page=100&slug='+urllib.parse.quote(slug))
  assert isinstance(candidates,list),'Invalid destination product list'
  if candidates:
    assert len(candidates)==1,'Duplicate destination product slug '+slug
    dest=candidates[0]
    assert normalize(dest['name'])==normalize(name),'Slug belongs to another product '+slug
    print('HOT_COMBO_PRODUCT_REUSED='+json.dumps({'id':dest['id'],'slug':slug}),flush=True)
  else:
    media_id=ensure_media(image,image.get('alt') or name)
    prices=source['prices']
    regular=str(prices['regular_price'])
    price=str(prices['price'])
    assert regular.isdigit() and price.isdigit() and int(price)>0
    detail={
      'name':name,'slug':slug,'type':'simple','status':'publish',
      'catalog_visibility':'visible','regular_price':regular,
      'manage_stock':False,'stock_status':'instock' if source['is_in_stock'] else 'outofstock',
      'images':[{'id':media_id,'alt':image.get('alt') or name}],
      'meta_data':[{'key':'_esc_origin_product_id','value':str(source_id)},
                   {'key':'product_lang','value':'vi'}],
    }
    if int(price)<int(regular): detail['sale_price']=price
    elif int(price)>int(regular): raise RuntimeError('Unexpected source price: '+slug)
    dest=api('/wp-json/wc/v3/products',method='POST',obj=detail)
    assert dest and int(dest['id'])>0, 'Product creation failed: '+slug
    print('HOT_COMBO_PRODUCT_CREATED='+json.dumps({'id':dest['id'],'slug':slug}),flush=True)
  target_id=int(dest['id'])
  # Guard locale before using product on the VI homepage. ACF may require a
  # separate update to maintain its field reference; do not fake a PASS.
  product=api('/wp-json/wp/v2/product/'+str(target_id)+'?context=edit')
  actual_lang=(product.get('acf') or {}).get('product_lang')
  if isinstance(actual_lang,dict): actual_lang=actual_lang.get('value')
  if actual_lang!='vi':
    api('/wp-json/wp/v2/product/'+str(target_id),method='POST',obj={'acf':{'product_lang':'vi'}})
    product=api('/wp-json/wp/v2/product/'+str(target_id)+'?context=edit')
    confirmed_lang=(product.get('acf') or {}).get('product_lang')
    if isinstance(confirmed_lang,dict): confirmed_lang=confirmed_lang.get('value')
    assert confirmed_lang=='vi', 'Product ACF locale unverified: '+str(target_id)
  dest_check=api('/wp-json/wc/v3/products/'+str(target_id))
  assert normalize(dest_check['name'])==normalize(name)
  assert dest_check['slug']==slug
  assert str(dest_check.get('regular_price'))==str(source['prices']['regular_price'])
  assert dest_check.get('images') and dest_check['images'][0].get('id'), 'Destination image missing'
  mappings.append({'source_id':source_id,'target_id':target_id,'slug':slug,'name':name})
Path('chatgpt/hot-combo-migration.json').write_text(
  json.dumps({'count':len(mappings),'mappings':mappings},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert len(mappings)==4,'Incomplete verified migration'
print('HOT_COMBO_MIGRATION_PASS='+json.dumps(mappings,ensure_ascii=False),flush=True)
