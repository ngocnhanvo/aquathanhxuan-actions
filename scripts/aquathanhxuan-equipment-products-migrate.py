#!/usr/bin/env python3
# Scoped, idempotent import for Home 06 filters and Home 07 lights; never rewrites prices of existing products.
"""Import 19 verified legacy filter/light products. No invented price, title or media."""
import hashlib, html, http.cookiejar, json, mimetypes, os, re, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

SOURCE = 'https://aquathanhxuan.com'
DEST = 'https://admin.aquathanhxuan.io.vn'
# Read-only legacy inventory (Actions run 42496162951) verified the exact IDs.
# WooCommerce source APIs remain authoritative for title, slug, price and media.
FILTER_IDS=[350156,269169,269168,269165,269143,269140,269105,269102,267192,267189]
LIGHT_IDS=[350158,350149,350144,350137,269193,269138,269135,267097,267093]
SOURCE_IDS=FILTER_IDS+LIGHT_IDS
assert len(SOURCE_IDS)==len(set(SOURCE_IDS))==19
EXPECTED={'found':[{'id':i} for i in SOURCE_IDS]}
CATEGORIES={
  'may-loc':{'name':'Máy lọc','expected_id':1769,'children':{
    'may-loc-loc-treo':'Lọc treo','may-loc-loc-thung':'Lọc thùng'}},
  'den':{'name':'Đèn','expected_id':1768,'children':{
    'den-den-led':'Đèn LED','den-den-roi':'Đèn rọi',
    'den-phu-kien':'Phụ kiện đèn'}}
}
CHILD_SOURCE_IDS={
  'may-loc-loc-treo':FILTER_IDS[:8],
  'may-loc-loc-thung':FILTER_IDS[8:],
  'den-den-led':LIGHT_IDS[:5],
  'den-den-roi':LIGHT_IDS[5:7],
  'den-phu-kien':LIGHT_IDS[7:],
}
assert sorted(i for ids in CHILD_SOURCE_IDS.values() for i in ids)==sorted(SOURCE_IDS)
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
opener.addheaders=[('User-Agent','AquaHome02VerifiedImporter/1.0')]

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

# Read the actual origin records immediately before any destination writes.
verified=[]
for expected in EXPECTED['found']:
  source=public(SOURCE+'/wp-json/wc/store/v1/products/'+str(expected['id']))
  assert int(source.get('id',0))==int(expected['id']), 'Source ID changed'
  assert normalize(source.get('name')) and source.get('slug'), 'Source identity incomplete'
  assert source.get('status') in (None,'publish'), 'Source product not published'
  assert source.get('type')=='simple', 'Only source simple products permitted'
  prices=source.get('prices') or {}
  assert int(prices.get('currency_minor_unit',-1))==0, 'Unexpected currency precision'
  assert str(prices.get('price') or '').isdigit() and int(prices['price'])>0,'Invalid source price'
  assert str(prices.get('regular_price') or '').isdigit(),'Invalid regular price'
  image=next((x for x in source.get('images') or [] if x.get('src')),None)
  assert image and str(image['src']).startswith(SOURCE+'/wp-content/uploads/'),'Origin-owned media missing'
  assert isinstance(source.get('is_in_stock'),bool),'Unknown source stock state'
  verified.append((source,image))
print('EQUIPMENT_ORIGIN_RECORDS_VERIFIED='+str(len(verified)),flush=True)

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

# Create only child terms for two independently verified native root categories.
# Preserve every other existing WooCommerce taxonomy and product assignment.
taxonomy=api('/wp-json/wc/v3/products/categories?per_page=100')
assert isinstance(taxonomy,list),'Cannot read destination WooCommerce taxonomy'
roots={}
children={}
for root_slug,spec in CATEGORIES.items():
    found=[c for c in taxonomy if c.get('slug')==root_slug and int(c.get('parent') or 0)==0]
    assert len(found)==1 and int(found[0]['id'])==spec['expected_id'],'Unexpected equipment category root'
    assert normalize(found[0]['name'])==normalize(spec['name']),'Equipment root name changed'
    roots[root_slug]=int(found[0]['id'])
    for child_slug,label in spec['children'].items():
        matches=[c for c in taxonomy if c.get('slug')==child_slug]
        assert len(matches)<=1,'Ambiguous destination child slug'
        if matches:
            child=matches[0]
            assert int(child.get('parent') or 0)==roots[root_slug] and normalize(child['name'])==normalize(label),'Child taxonomy conflict'
        else:
            child=api('/wp-json/wc/v3/products/categories',method='POST',
                      obj={'name':label,'slug':child_slug,'parent':roots[root_slug]})
            taxonomy.append(child)
            print('EQUIPMENT_CHILD_CATEGORY_CREATED='+json.dumps({'slug':child_slug,'id':child['id']}),flush=True)
        children[child_slug]=int(child['id'])
category_by_source={}
for child_slug,ids in CHILD_SOURCE_IDS.items():
    root_slug='may-loc' if child_slug.startswith('may-loc-') else 'den'
    for source_id in ids:
        assert source_id not in category_by_source,'Duplicate Product category mapping'
        category_by_source[source_id]=(roots[root_slug],children[child_slug])
assert set(category_by_source)==set(SOURCE_IDS)
print('EQUIPMENT_CATEGORY_READY='+str(len(children)),flush=True)

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
    print('EQUIPMENT_PRODUCT_REUSED='+json.dumps({'id':dest['id'],'slug':slug}),flush=True)
  else:
    media_id=ensure_media(image,image.get('alt') or name)
    prices=source['prices']
    regular=str(prices['regular_price'])
    price=str(prices['price'])
    assert regular.isdigit() and price.isdigit() and int(price)>0
    detail={
      'name':name,'slug':slug,'type':'simple','status':'publish',
      'catalog_visibility':'visible','regular_price':regular,
      'manage_stock':False,'stock_status':'instock' if source.get('is_in_stock') else 'outofstock',
      'images':[{'id':media_id,'alt':image.get('alt') or name}],
      'meta_data':[{'key':'_esc_origin_product_id','value':str(source_id)},
                   {'key':'product_lang','value':'vi'}],
    }
    if int(price)<int(regular): detail['sale_price']=price
    elif int(price)>int(regular): raise RuntimeError('Unexpected source price: '+slug)
    detail['categories']=[{'id':cid} for cid in category_by_source[source_id]]
    dest=api('/wp-json/wc/v3/products',method='POST',obj=detail)
    assert dest and int(dest['id'])>0, 'Product creation failed: '+slug
    print('EQUIPMENT_PRODUCT_CREATED='+json.dumps({'id':dest['id'],'slug':slug}),flush=True)
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
  required=set(category_by_source[source_id])
  existing_ids={int(c['id']) for c in dest_check.get('categories') or []}
  if not required.issubset(existing_ids):
    merged=sorted(required|existing_ids)
    api('/wp-json/wc/v3/products/'+str(target_id),method='POST',
        obj={'categories':[{'id':cid} for cid in merged]})
    dest_check=api('/wp-json/wc/v3/products/'+str(target_id))
  assert required.issubset({int(c['id']) for c in dest_check.get('categories') or []}), 'Category linkage lost'
  assert normalize(dest_check['name'])==normalize(name)
  assert dest_check['slug']==slug
  assert str(dest_check.get('regular_price'))==str(source['prices']['regular_price'])
  assert dest_check.get('images') and dest_check['images'][0].get('id'), 'Destination image missing'
  mappings.append({'source_id':source_id,'target_id':target_id,'slug':slug,'name':name})
Path('chatgpt/equipment-products-migration.json').write_text(
  json.dumps({'count':len(mappings),'mappings':mappings},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert len(mappings)==len(SOURCE_IDS),'Incomplete verified migration'
print('EQUIPMENT_MIGRATION_PASS='+json.dumps(mappings,ensure_ascii=False),flush=True)
