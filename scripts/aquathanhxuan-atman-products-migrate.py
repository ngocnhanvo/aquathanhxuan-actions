#!/usr/bin/env python3
# Scoped, idempotent import for Home 06 filters and Home 07 lights; never rewrites prices of existing products.
"""Migrate exactly nine verified ATMAN legacy products with images and SEO, idempotently."""
import hashlib, html, http.cookiejar, json, mimetypes, os, re, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

SOURCE = 'https://aquathanhxuan.com'
DEST = 'https://admin.aquathanhxuan.io.vn'
SOURCE_CATEGORY_ID = 2162
TARGET_CATEGORY_ID = 1793
TARGET_PARENT_ID = 1767
SOURCE_IDS = [242514, 5120, 4867, 3604, 1405, 1401, 1397, 1395, 1394]
assert len(SOURCE_IDS) == len(set(SOURCE_IDS)) == 9
EXPECTED = {'found':[{'id':i} for i in SOURCE_IDS]}
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
opener.addheaders=[('User-Agent','AquaAtmanVerifiedImporter/1.0')]

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

# Independent source category membership preflight: do not import a changed/expanded source set.
source_listing = public(SOURCE+'/wp-json/wc/store/v1/products?category='+str(SOURCE_CATEGORY_ID)+'&per_page=100')
assert isinstance(source_listing,list), 'Source Atman category listing unavailable'
assert sorted(int(x['id']) for x in source_listing) == sorted(SOURCE_IDS), 'Source category no longer contains exactly the audited nine products'
print('ATMAN_LEGACY_CATEGORY_VERIFIED='+str(len(source_listing)),flush=True)

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
print('ATMAN_ORIGIN_RECORDS_VERIFIED='+str(len(verified)),flush=True)

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

# No category mutations; the brand taxonomy already exists.
taxonomy=api('/wp-json/wc/v3/products/categories?per_page=100')
assert isinstance(taxonomy,list),'Cannot read destination WooCommerce taxonomy'
matching=[c for c in taxonomy if c.get('slug')=='atman']
assert len(matching)==1,'Unexpected target Atman slug count'
atman=matching[0]
assert int(atman['id'])==TARGET_CATEGORY_ID and int(atman.get('parent') or 0)==TARGET_PARENT_ID, 'Atman category ownership changed'
assert normalize(atman.get('name')) == normalize('ATMAN'),'Atman category label changed'
print('ATMAN_TARGET_CATEGORY_VERIFIED='+json.dumps({'id':TARGET_CATEGORY_ID,'parent':TARGET_PARENT_ID}),flush=True)

from html.parser import HTMLParser

class SEOHeadParser(HTMLParser):
  def __init__(self):
    super().__init__()
    self.title_parts=[]
    self.in_title=False
    self.description=''
  def handle_starttag(self,tag,attrs):
    if tag=='title': self.in_title=True
    if tag=='meta':
      values=dict(attrs)
      if str(values.get('name','')).lower()=='description':
        self.description=str(values.get('content') or '').strip()
  def handle_endtag(self,tag):
    if tag=='title': self.in_title=False
  def handle_data(self,data):
    if self.in_title: self.title_parts.append(data)

def source_seo(slug):
  url = SOURCE + '/san-pham/' + urllib.parse.quote(slug) + '/'
  with request(url,headers={'Cache-Control':'no-cache'}) as response:
    document=response.read(400000).decode('utf-8','replace')
  parser=SEOHeadParser()
  parser.feed(document.split('</head>',1)[0])
  title=html.unescape(' '.join(parser.title_parts).strip())
  description=html.unescape(parser.description)
  print('ATMAN_SOURCE_SEO='+json.dumps({'slug':slug,'title':title or 'SEO_SOURCE_MISSING','description':description or 'SEO_SOURCE_MISSING'},ensure_ascii=False),flush=True)
  return title,description

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

Path('artifacts').mkdir(parents=True,exist_ok=True)
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
    print('ATMAN_PRODUCT_REUSED='+json.dumps({'id':dest['id'],'slug':slug}),flush=True)
  else:
    media_id=ensure_media(image,image.get('alt') or name)
    prices=source['prices']
    regular=str(prices['regular_price'])
    price=str(prices['price'])
    assert regular.isdigit() and price.isdigit() and int(price)>0
    # Fetch the real source SEO metadata; do not invent from display name.
    seo_title,seo_description=source_seo(slug)
    metadata=[{'key':'_esc_origin_product_id','value':str(source_id)},
              {'key':'product_lang','value':'vi'}]
    if seo_title: metadata.append({'key':'_yoast_wpseo_title','value':seo_title})
    if seo_description: metadata.append({'key':'_yoast_wpseo_metadesc','value':seo_description})
    detail={
      'name':name,'slug':slug,'type':'simple','status':'publish',
      'catalog_visibility':'visible','regular_price':regular,
      'manage_stock':False,'stock_status':'instock' if source.get('is_in_stock') else 'outofstock',
      'images':[{'id':media_id,'alt':image.get('alt') or name}],
      'meta_data':metadata,
    }
    if int(price)<int(regular): detail['sale_price']=price
    elif int(price)>int(regular): raise RuntimeError('Unexpected source price: '+slug)
    detail['categories']=[{'id':TARGET_CATEGORY_ID}]
    dest=api('/wp-json/wc/v3/products',method='POST',obj=detail)
    assert dest and int(dest['id'])>0, 'Product creation failed: '+slug
    print('ATMAN_PRODUCT_CREATED='+json.dumps({'id':dest['id'],'slug':slug}),flush=True)
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
  required={TARGET_CATEGORY_ID}
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
Path('artifacts/atman-products-migration.json').write_text(
  json.dumps({'count':len(mappings),'mappings':mappings},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert len(mappings)==len(SOURCE_IDS),'Incomplete verified migration'
print('ATMAN_MIGRATION_PASS='+json.dumps(mappings,ensure_ascii=False),flush=True)
