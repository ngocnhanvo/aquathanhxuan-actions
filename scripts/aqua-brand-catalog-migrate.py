#!/usr/bin/env python3
"""Idempotent verified WooCommerce brand product migration, source-only values.

WRITE_SCOPE: only missing WooCommerce Products under selected existing
brand categories, original media attached to them, and missing category/locale/
Yoast fields of verified existing products. Does not change menu/taxonomy/Atman.
"""
import hashlib
import html
import http.cookiejar
import json
import mimetypes
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

SOURCE = 'https://aquathanhxuan.com'
DEST = 'https://admin.aquathanhxuan.io.vn'
SOURCE_BRAND_ROOT = 2019
TARGET_BRAND_ROOT = 1767
TARGET_SLUGS = [s.strip() for s in os.environ.get('BRAND_TARGET_SLUGS', '').split(',') if s.strip()]
BATCH = os.environ.get('BRAND_BATCH', 'brand-import')
assert TARGET_SLUGS and len(set(TARGET_SLUGS)) == len(TARGET_SLUGS), 'Missing scoped brand target slugs'
assert all(re.fullmatch(r'[a-z0-9-]{2,90}', x) for x in TARGET_SLUGS), 'Unsafe category slug'
assert re.fullmatch(r'[a-z0-9-]{2,90}', BATCH), 'Unsafe batch name'
username = os.environ.get('WP_ADMIN_USERNAME', '')
password = os.environ.get('WP_ADMIN_PASSWORD', '')
assert username and password, 'Missing WordPress CMS login'
env = dict(item for item in (
    tuple(line.split('=', 1)) for line in os.environ.get('ENV_FILE', '').splitlines()
    if '=' in line and not line.lstrip().startswith('#')
) if len(item) == 2)
assert env.get('WC_URL', '').strip('"\'') == DEST, 'Wrong WordPress target'
output_dir = Path('artifacts/aqua-brand-migration')
output_dir.mkdir(parents=True, exist_ok=True)
checkpoint_path = output_dir / (BATCH + '.json')
journal = {
    'batch': BATCH, 'source': SOURCE, 'target': DEST, 'requested': TARGET_SLUGS,
    'write_scope': 'scoped brand products + localized media + ACF locale + missing Yoast',
    'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'brands': [], 'products': [], 'asset_deferred': [],
    'created': 0, 'reused': 0, 'category_linked': 0, 'failed': 0,
}
def save():
    checkpoint_path.write_text(json.dumps(journal, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
save()

cookies = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
opener.addheaders = [('User-Agent', 'AquaBrandVerifiedMigration/1.0')]

class AssetDeferred(RuntimeError):
    def __init__(self, url, filename, source_id, attempts, reason):
        self.record = {'source_url':url, 'source_filename':filename,'parent_record':source_id,
                       'asset_type':'image','attempt_count':attempts,'error':reason,'status':'ASSET_DEFERRED'}
        super().__init__(f'ASSET_DEFERRED source={source_id} filename={filename} error={reason}')

def request(url, method='GET', data=None, headers=None, timeout=40):
    """Retry only read operations; never retry POST blindly after a lost response."""
    tries = 4 if method == 'GET' else 1
    for attempt in range(tries):
        req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
        try:
            return opener.open(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            message=e.read().decode('utf-8','replace')
            temporary = (e.code in (429, 500, 502, 503, 504))
            if temporary and method == 'GET' and attempt < tries - 1:
                time.sleep(attempt + 1)
                continue
            raise RuntimeError(f'HTTP {e.code} {url}: {message[:250]}') from e
        except (TimeoutError, ConnectionError, urllib.error.URLError, OSError) as e:
            if method == 'GET' and attempt < tries - 1:
                time.sleep(attempt + 1)
                continue
            raise RuntimeError(f'Network {method} {url}: {e}') from e

def get_json(url):
    with request(url, headers={'Cache-Control':'no-cache'}) as r:
        return json.loads(r.read().decode('utf-8'))

def all_source_categories():
    out=[]
    for page in range(1,15):
        rows=get_json(SOURCE + '/wp-json/wc/store/v1/products/categories?per_page=100&page='+str(page))
        assert isinstance(rows,list), 'Invalid source taxonomy'
        out.extend(rows)
        if len(rows)<100: break
    return out

def normalize(value):
    return ''.join(html.unescape(re.sub('<[^>]*>', ' ', str(value or ''))).casefold().split())

# Auth once; reuse exact WordPress nonce so WP REST can write only authorized records.
request(DEST + '/wp-login.php').read()
payload=urllib.parse.urlencode({'log':username,'pwd':password,'wp-submit':'Log In',
 'redirect_to':DEST+'/wp-admin/','testcookie':'1'}).encode()
dashboard=request(DEST+'/wp-login.php', method='POST', data=payload,
                  headers={'Content-Type':'application/x-www-form-urlencoded'}).read().decode('utf-8','replace')
assert 'wp-admin-bar-my-account' in dashboard, 'CMS login failed'
match=re.search(r'wpApiSettings\s*=\s*(\{.*?\})\s*;',dashboard,re.S)
nonce=''
if match:
    try: nonce=json.loads(match.group(1)).get('nonce','')
    except json.JSONDecodeError: pass
if not nonce:
    m=re.search(r'"nonce"\s*:\s*"([A-Za-z0-9]+)"',dashboard)
    nonce=m.group(1) if m else ''
assert nonce, 'WordPress REST nonce missing'

def api(path, method='GET', obj=None, raw=None, headers=None):
    hdr={'X-WP-Nonce':nonce,'Accept':'application/json'}
    if headers: hdr.update(headers)
    if obj is not None:
        raw=json.dumps(obj,ensure_ascii=False).encode('utf-8')
        hdr['Content-Type']='application/json; charset=utf-8'
    with request(DEST+path,method=method,data=raw,headers=hdr,timeout=70) as response:
        data=response.read()
    return json.loads(data.decode('utf-8')) if data else None

def target_categories():
    out=[]
    for page in range(1,20):
        rows=api('/wp-json/wc/v3/products/categories?per_page=100&page='+str(page))
        assert isinstance(rows,list),'Invalid target categories'
        out.extend(rows)
        if len(rows)<100: break
    return out

def source_list(category_id):
    out=[]
    for page in range(1,30):
        rows=get_json(SOURCE+'/wp-json/wc/store/v1/products?per_page=100&page='+str(page)+'&category='+str(category_id))
        assert isinstance(rows,list),'Invalid source category product API '+str(category_id)
        out.extend(rows)
        if len(rows)<100: break
    assert len(out)==len(set(int(item['id']) for item in out)), 'Duplicated products in source category '+str(category_id)
    return out

src_cats=all_source_categories()
dst_cats=target_categories()
src_root=[c for c in src_cats if int(c['id'])==SOURCE_BRAND_ROOT]
dst_root=[c for c in dst_cats if int(c['id'])==TARGET_BRAND_ROOT]
assert len(src_root)==len(dst_root)==1
assert src_root[0]['slug']==dst_root[0]['slug']=='thuong-hieu','Brand root changed'
src_brands=[c for c in src_cats if int(c.get('parent') or 0)==SOURCE_BRAND_ROOT]
dst_brands=[c for c in dst_cats if int(c.get('parent') or 0)==TARGET_BRAND_ROOT]

# Independent target category ownership preflight.
brand_pairs=[]
for slug in TARGET_SLUGS:
    candidates=[c for c in dst_brands if c.get('slug')==slug]
    assert len(candidates)==1,'Requested target brand taxonomy missing/ambiguous: '+slug
    target=candidates[0]
    source_matches=[c for c in src_brands if normalize(c['name'])==normalize(target['name'])]
    assert len(source_matches)==1,'Source brand matching ambiguous/missing: '+target['name']
    src=source_matches[0]
    listing=source_list(src['id'])
    for x in listing:
        assert x.get('type')=='simple','Variable/unsupported product in '+target['name']+': '+str(x.get('id'))
        assert x.get('slug') and x.get('name'),'Invalid source product identity'
    brand_pairs.append((src,target,listing))
    journal['brands'].append({
      'name':target['name'],'source_id':src['id'],'target_id':target['id'],
      'source_slug':src['slug'],'target_slug':target['slug'],'verified_count':len(listing),
      'created':0,'reused':0,'deferred':0
    })
    print('BRAND_CATEGORY_PREFLIGHT='+json.dumps(journal['brands'][-1],ensure_ascii=False),flush=True)
save()

# Source IDs are authenticated from the independent source Store API, not fabricated.
source_product_groups={}
for src,target,rows in brand_pairs:
    for row in rows:
        sid=int(row['id'])
        x=source_product_groups.setdefault(sid,{'slug':row['slug'],'name':row['name'],'brands':[]})
        assert row['slug']==x['slug'] and normalize(row['name'])==normalize(x['name']), 'Source identity contradiction'
        x['brands'].append(int(target['id']))
print('BRAND_SOURCE_SCOPE_PASS='+json.dumps({'brands':len(brand_pairs),'unique_source_products':len(source_product_groups)}),flush=True)

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
    url=SOURCE+'/san-pham/'+urllib.parse.quote(slug)+'/'
    with request(url,headers={'Cache-Control':'no-cache'},timeout=40) as response:
        text=response.read(500000).decode('utf-8','replace')
    parser=SEOHeadParser()
    parser.feed(text.split('</head>',1)[0])
    title=html.unescape(' '.join(parser.title_parts).strip())
    description=html.unescape(parser.description)
    return title,description

image_cache={}
image_name_cache={}
def image_uri(value,source_id):
    url=str(value or '').strip()
    parsed=urllib.parse.urlparse(url)
    filename=os.path.basename(urllib.parse.unquote(parsed.path))
    assert url.startswith(SOURCE+'/wp-content/uploads/') and filename, 'Not original media: '+url[:110]
    if '"' in filename or '/' in filename: raise AssetDeferred(url,filename,source_id,0,'Unsafe original filename')
    return url,filename

def retrieve_asset(uri,filename,source_id):
    data=None
    for attempt in range(1,5):
        try:
            req=urllib.request.Request(uri,headers={'Cache-Control':'no-cache'})
            with opener.open(req,timeout=55) as r: data=r.read()
            if not data or len(data)<120: raise ValueError('Media payload empty/truncated')
            if data[:12].lower().startswith(b'<!doctype'): raise ValueError('Media response is HTML')
            return data
        except urllib.error.HTTPError as exc:
            # Permanent not-found/auth/malformed assets must be deferred at once.
            if exc.code not in (429,500,502,503,504) or attempt==4:
                raise AssetDeferred(uri,filename,source_id,attempt,'HTTP '+str(exc.code)) from exc
        except Exception as exc:
            if attempt==4: raise AssetDeferred(uri,filename,source_id,attempt,str(exc)[:250]) from exc
        time.sleep(attempt)
    raise AssertionError('unreachable')

def ensure_media(src,alt,source_id):
    uri,filename=image_uri(src,source_id)
    if uri in image_cache: return image_cache[uri]
    content=retrieve_asset(uri,filename,source_id)
    digest=hashlib.sha256(content).hexdigest()
    if filename in image_name_cache:
        old_digest,media_id,path=image_name_cache[filename]
        if digest!=old_digest: raise AssetDeferred(uri,filename,source_id,1,'Different media bytes with same filename')
        image_cache[uri]=(media_id,path)
        return media_id,path
    stem=os.path.splitext(filename)[0]
    found=api('/wp-json/wp/v2/media?context=edit&per_page=100&search='+urllib.parse.quote(stem))
    assert isinstance(found,list),'Media search API invalid'
    for m in found:
        existing=os.path.basename(urllib.parse.unquote(urllib.parse.urlparse(m.get('source_url','')).path))
        if existing!=filename: continue
        actual=retrieve_asset(urllib.parse.urljoin(DEST+'/',m['source_url']),filename,source_id)
        if hashlib.sha256(actual).hexdigest()!=digest:
            raise AssetDeferred(uri,filename,source_id,1,'Existing WP media same filename with DIFFERENT bytes')
        media_id=int(m['id'])
        path=urllib.parse.urlparse(m['source_url']).path
        assert path.startswith('/wp-content/uploads/'),'Existing destination asset path invalid'
        image_cache[uri]=(media_id,path)
        image_name_cache[filename]=(digest,media_id,path)
        return media_id,path
    media=api('/wp-json/wp/v2/media',method='POST',raw=content,headers={
        'Content-Type':mimetypes.guess_type(filename)[0] or 'application/octet-stream',
        'Content-Disposition':'attachment; filename="'+filename+'"'
    })
    media_id=int(media['id'])
    media_url=str(media.get('source_url') or '')
    actual_name=os.path.basename(urllib.parse.unquote(urllib.parse.urlparse(media_url).path))
    if actual_name!=filename:
        raise AssetDeferred(uri,filename,source_id,1,'WordPress renamed original media to '+actual_name)
    path=urllib.parse.urlparse(media_url).path
    assert path.startswith('/wp-content/uploads/'),'Uploaded asset missing WP media path'
    api('/wp-json/wp/v2/media/'+str(media_id),method='POST',obj={'alt_text':alt or ''})
    image_cache[uri]=(media_id,path)
    image_name_cache[filename]=(digest,media_id,path)
    print('BRAND_MEDIA_CREATED='+json.dumps({'id':media_id,'filename':filename,'source_id':source_id}),flush=True)
    return media_id,path

source_media_regex=re.compile(r'https?://aquathanhxuan\.com/wp-content/uploads/[^\s"\'<>]+',re.I)
def localize_html(value,source_id):
    content=str(value or '')
    matches=list(dict.fromkeys(source_media_regex.findall(content)))
    for uri in matches:
        # HTML may escape query separators or contain URL fragments.
        original_uri=html.unescape(uri)
        parsed=urllib.parse.urlparse(original_uri)
        canonical=parsed._replace(query='',fragment='').geturl()
        media_id,path=ensure_media(canonical,'',source_id)
        content=content.replace(uri,path)
    return content

def lookup_slug(slug):
    records=api('/wp-json/wc/v3/products?status=any&per_page=100&slug='+urllib.parse.quote(slug))
    assert isinstance(records,list),'Invalid target lookup for '+slug
    assert len(records)<2,'Ambiguous existing target product slug '+slug
    return records[0] if records else None

def ensure_locale(target_id):
    product=api('/wp-json/wp/v2/product/'+str(target_id)+'?context=edit')
    actual=(product.get('acf') or {}).get('product_lang')
    if isinstance(actual,dict): actual=actual.get('value')
    if actual=='vi': return
    api('/wp-json/wp/v2/product/'+str(target_id),method='POST',obj={'acf':{'product_lang':'vi'}})
    check=api('/wp-json/wp/v2/product/'+str(target_id)+'?context=edit')
    value=(check.get('acf') or {}).get('product_lang')
    if isinstance(value,dict): value=value.get('value')
    assert value=='vi','Failed to save source language to ACF Product '+str(target_id)

def migrate_one(source_id, info):
    src=get_json(SOURCE+'/wp-json/wc/store/v1/products/'+str(source_id))
    assert int(src.get('id') or 0)==source_id and src.get('slug')==info['slug'], 'Source product identity changed'
    assert normalize(src.get('name'))==normalize(info['name']), 'Source Product title changed'
    assert src.get('type')=='simple','Product source type changed'
    assert isinstance(src.get('is_in_stock'),bool),'Source availability missing'
    prices=src.get('prices') or {}
    assert int(prices.get('currency_minor_unit',-1))==0,'Unexpected price currency minor unit'
    current=str(prices.get('price') or '')
    regular=str(prices.get('regular_price') or '')
    assert current.isdigit() and regular.isdigit() and int(current)>=0 and int(regular)>=0,'Invalid source product price'
    if int(current)>int(regular):raise ValueError('Current price exceeds regular price')
    name=html.unescape(re.sub(r'<[^>]*>',' ',str(src['name']))).strip()
    slug=src['slug']
    existing=lookup_slug(slug)
    # SEO must be audited on both creation and reuse, without invented metadata.
    seo_title,seo_description=source_seo(slug)
    if existing:
        assert normalize(existing.get('name'))==normalize(name), 'Slug already belongs to another Product'
        meta=existing.get('meta_data') or []
        origin_ref=[str(m.get('value')) for m in meta if m.get('key')=='_esc_origin_product_id']
        assert not origin_ref or origin_ref==[str(source_id)],'Existing product belongs to different original Product'
        to_add=[{'key':'_esc_origin_product_id','value':str(source_id)}] if not origin_ref else []
        if seo_title and not any(m.get('key')=='_yoast_wpseo_title' and str(m.get('value') or '').strip() for m in meta):
            to_add.append({'key':'_yoast_wpseo_title','value':seo_title})
        if seo_description and not any(m.get('key')=='_yoast_wpseo_metadesc' and str(m.get('value') or '').strip() for m in meta):
            to_add.append({'key':'_yoast_wpseo_metadesc','value':seo_description})
        old_categories={int(c['id']) for c in existing.get('categories') or []}
        needed=set(info['brands'])
        updates={}
        if not needed.issubset(old_categories):
            updates['categories']=[{'id':c} for c in sorted(old_categories|needed)]
        if to_add: updates['meta_data']=to_add
        if updates:
            existing=api('/wp-json/wc/v3/products/'+str(existing['id']),method='POST',obj=updates)
            if 'categories' in updates:journal['category_linked']+=1
        target_id=int(existing['id'])
        ensure_locale(target_id)
        result='reused'
        journal['reused']+=1
    else:
        images=[]
        original_images=src.get('images') or []
        assert original_images,'Published source product has no image'
        for item in original_images:
            uri=item.get('src') or ''
            if not uri: continue
            mid,path=ensure_media(uri,item.get('alt') or name,source_id)
            images.append({'id':mid,'alt':item.get('alt') or name})
        assert images,'Cannot import without original product media'
        description=localize_html(src.get('description') or '',source_id)
        short_description=localize_html(src.get('short_description') or '',source_id)
        metadata=[{'key':'_esc_origin_product_id','value':str(source_id)},
                  {'key':'product_lang','value':'vi'}]
        if seo_title:metadata.append({'key':'_yoast_wpseo_title','value':seo_title})
        if seo_description:metadata.append({'key':'_yoast_wpseo_metadesc','value':seo_description})
        fields={
            'name':name,'slug':slug,'type':'simple','status':'publish',
            'catalog_visibility':'visible',
            'regular_price':regular,'description':description,'short_description':short_description,
            'manage_stock':False,'stock_status':'instock' if src.get('is_in_stock') else 'outofstock',
            'categories':[{'id':c} for c in sorted(set(info['brands']))],
            'images':images,'meta_data':metadata
        }
        if int(current)<int(regular):fields['sale_price']=current
        product=api('/wp-json/wc/v3/products',method='POST',obj=fields)
        target_id=int(product['id'])
        ensure_locale(target_id)
        result='created'
        journal['created']+=1
        print('BRAND_PRODUCT_CREATED='+json.dumps({'source_id':source_id,'target_id':target_id,'slug':slug}),flush=True)
    check=api('/wp-json/wc/v3/products/'+str(target_id))
    assert check['slug']==slug and normalize(check['name'])==normalize(name),'Target identity check failed'
    assert set(info['brands']).issubset({int(c['id']) for c in check.get('categories') or []}), 'Target brand link absent'
    assert check.get('images') and int(check['images'][0]['id'])>0, 'Target product has no media'
    if result=='created':
        assert str(check.get('regular_price') or '')==regular,'New target regular price mismatch'
        assert str(check.get('price') or '')==current,'New target actual price mismatch'
    stored_meta=check.get('meta_data') or []
    assert any(m.get('key')=='_esc_origin_product_id' and str(m.get('value'))==str(source_id) for m in stored_meta),'Original product id not persisted'
    if seo_title:
        assert any(m.get('key')=='_yoast_wpseo_title' and str(m.get('value') or '').strip() for m in stored_meta),'Yoast title missing after write'
    return {'source_id':source_id,'target_id':target_id,'slug':slug,'status':result,'categories':info['brands'],
            'seo_title':bool(seo_title),'seo_description':bool(seo_description)}

for source_id,info in source_product_groups.items():
    try:
        result=migrate_one(source_id,info)
        journal['products'].append(result)
        for brand in journal['brands']:
            if brand['target_id'] in info['brands']:
                brand[result['status']]+=1
    except AssetDeferred as e:
        journal['failed']+=1
        journal['asset_deferred'].append(e.record)
        journal['products'].append({'source_id':source_id,'slug':info['slug'],'status':'ASSET_DEFERRED','error':str(e)})
        for brand in journal['brands']:
            if brand['target_id'] in info['brands']:brand['deferred']+=1
        print('BRAND_ASSET_DEFERRED='+json.dumps(e.record,ensure_ascii=False),flush=True)
    except Exception as e:
        journal['failed']+=1
        journal['products'].append({'source_id':source_id,'slug':info['slug'],'status':'FAILED','error':str(e)})
        for brand in journal['brands']:
            if brand['target_id'] in info['brands']:brand['deferred']+=1
        print('BRAND_PRODUCT_FAILED='+json.dumps({'source_id':source_id,'slug':info['slug'],'error':str(e)[:220]},ensure_ascii=False),flush=True)
    save()

journal['finished_at']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
journal['status']='PASS' if journal['failed']==0 and len(journal['products'])==len(source_product_groups) else 'PARTIAL'
save()
print('BRAND_MIGRATION_RESULT='+json.dumps({'batch':BATCH,'status':journal['status'],
    'expected':len(source_product_groups),'created':journal['created'],'reused':journal['reused'],
    'category_linked':journal['category_linked'],'failed':journal['failed'],
    'deferred_ids':[x['source_id'] for x in journal['products'] if x['status'] in ('FAILED','ASSET_DEFERRED')]},ensure_ascii=False),flush=True)
if journal['status']!='PASS':raise SystemExit(1)
