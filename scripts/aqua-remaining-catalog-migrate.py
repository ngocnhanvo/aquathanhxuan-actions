#!/usr/bin/env python3
"""Migrate only source-verified Products in nine remaining Aqua menu roots.

Inventory manifest (generated read-only in same workflow) pins all 389 source IDs,
destination terms and slugs. Existing Products are identity checked; no menu edits.
Original image bytes/filenames are preserved; inaccessible covers are recorded as
ASSET_DEFERRED without preventing import of genuine product details.
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
TARGET_SLUGS = ['may-loc','vat-lieu-loc','phu-kien','da-lua-va-cat','thuoc-xu-ly-van-de','be-kinh-va-chan','nen-cho-be-thuy-sinh','co2','cay-va-ca-thuy-sinh']
BATCH_COUNT = int(os.environ.get('AQUA_BATCH_COUNT','13'))
BATCH_INDEX = int(os.environ.get('AQUA_BATCH_INDEX','0'))
BATCH = 'remaining-'+str(BATCH_INDEX)
assert 1 <= BATCH_COUNT <= 64 and 0 <= BATCH_INDEX < BATCH_COUNT, 'Invalid catalog batch'
assert all(re.fullmatch(r'[a-z0-9-]+',x) for x in TARGET_SLUGS)
username = os.environ.get('WP_ADMIN_USERNAME', '')
password = os.environ.get('WP_ADMIN_PASSWORD', '')
assert username and password, 'Missing WordPress CMS login'
env = dict(item for item in (
    tuple(line.split('=', 1)) for line in os.environ.get('ENV_FILE', '').splitlines()
    if '=' in line and not line.lstrip().startswith('#')
) if len(item) == 2)
assert env.get('WC_URL', '').strip('"\'') == DEST, 'Wrong WordPress target'
output_dir = Path('artifacts/aqua-remaining-migration')
output_dir.mkdir(parents=True, exist_ok=True)
checkpoint_path = output_dir / (BATCH + '.json')
journal = {
    'batch': BATCH, 'source': SOURCE, 'target': DEST, 'requested': TARGET_SLUGS,
    'write_scope': '389 verified source products within nine menu roots only; originals + ACF vi + Yoast; no menu modifications',
    'batch_index':BATCH_INDEX,'batch_count':BATCH_COUNT,
    'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'brands': [], 'products': [], 'asset_deferred': [],
    'created': 0, 'reused': 0, 'category_linked': 0, 'failed': 0,
}
def save():
    checkpoint_path.write_text(json.dumps(journal, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
save()

cookies = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
opener.addheaders = [('User-Agent', 'AquaLightVerifiedMigration/1.0')]

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

# The same run's read-only inventory is the only authorized source of write IDs.
manifest_path=Path('artifacts/aqua-remaining-catalog/inventory.json')
assert manifest_path.is_file(),'Missing verified source/target inventory artifact'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
assert manifest.get('read_only') is True and manifest.get('source')==SOURCE and manifest.get('target')==DEST
assert manifest.get('state')=='PASS','Catalog taxonomy or identity inventory not approved'
assert manifest.get('unique_count')==389,'Source catalog count changed since inventory'
assert manifest.get('identity_conflicts')==0 and manifest.get('missing_target_category_count')==0
assert manifest.get('type_counts')=={'simple':389},'Variable product requires separate source strategy'
assert set(r['target_slug'] for r in manifest['roots'])==set(TARGET_SLUGS),'Wrong root scope'
assert len(manifest.get('roots') or [])==9,'All nine roots must be verified'
for root in manifest['roots']:
    assert int(root['source_id'])>0 and int(root['target_id'])>0,'Unmapped source/target root'
for category in manifest['categories']:
    assert category['target_category_id'] is not None,'Unmapped product category'
    journal['brands'].append({
      'name':category['name'],'source_id':category['source_category_id'],
      'target_id':category['target_category_id'],'source_slug':category['source_slug'],
      'target_slug':category['target_slug'],'verified_count':category['store_listing_count'],
      'created':0,'reused':0,'deferred':0,
    })
source_product_groups={}
for product in manifest['unique_products']:
    sid=int(product['source_id'])
    assert sid>0 and product['type']=='simple' and product.get('slug') and product.get('name')
    assert not product.get('name_conflict') and not product.get('source_id_conflict')
    assert product['target_term_ids'],'Product lacks mapped destination taxonomy '+str(sid)
    entry={'slug':product['slug'],'name':product['name'],
           'brands':sorted(set(int(c) for c in product['target_term_ids']))}
    assert sid not in source_product_groups,'Duplicate source Product ID'
    source_product_groups[sid]=entry
assert len(source_product_groups)==389,'Scope source IDs not unique'
source_product_groups={sid:entry for sid,entry in sorted(source_product_groups.items())
  if sid%BATCH_COUNT==BATCH_INDEX}
journal['inventory_state']='PASS'
journal['inventory_unique_count']=389
journal['selected_source_ids']=list(source_product_groups)
save()
print('AQUA_REMAINING_SOURCE_SCOPE_PASS='+json.dumps({
  'inventory_unique':389,'batch':BATCH_INDEX,'count':BATCH_COUNT,'selected':len(source_product_groups),
  'roots':len(manifest['roots']),'categories':len(manifest['categories'])
}),flush=True)

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

def ensure_media_exact(src,alt,source_id):
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
        # This upload was created by this exact request but WP renamed it; do
        # not leave an orphan or quietly accept an unapproved filename.
        removal=api('/wp-json/wp/v2/media/'+str(media_id)+'?force=true',method='DELETE')
        assert removal and removal.get('deleted') is True, 'Renamed temporary upload cleanup failed'
        print('AQUA_REMAINING_RENAMED_UPLOAD_CLEANUP_PASS='+str(media_id),flush=True)
        raise AssetDeferred(uri,filename,source_id,1,'WordPress renamed original media to '+actual_name)
    path=urllib.parse.urlparse(media_url).path
    assert path.startswith('/wp-content/uploads/'),'Uploaded asset missing WP media path'
    api('/wp-json/wp/v2/media/'+str(media_id),method='POST',obj={'alt_text':alt or ''})
    image_cache[uri]=(media_id,path)
    image_name_cache[filename]=(digest,media_id,path)
    print('AQUA_REMAINING_MEDIA_CREATED='+json.dumps({'id':media_id,'filename':filename,'source_id':source_id}),flush=True)
    return media_id,path

def ensure_media_in_original_month(src,alt,source_id):
    """Keep original filename and full-resolution bytes in its source year/month.

    WP REST core accepts a backdated non-Page parent post's date as the upload
    month. Create a scoped temporary draft and always remove it after upload.
    """
    uri,filename=image_uri(src,source_id)
    parsed=urllib.parse.urlparse(uri)
    match=re.fullmatch(r'/wp-content/uploads/([0-9]{4})/([0-9]{2})/([^/]+)',parsed.path)
    if not match or match.group(3)!=filename:
        raise AssetDeferred(uri,filename,source_id,0,'Unverified original media path')
    year,month=match.group(1),match.group(2)
    if not (2015<=int(year)<=2026 and 1<=int(month)<=12):
        raise AssetDeferred(uri,filename,source_id,0,'Invalid year/month source path')
    original_bytes=retrieve_asset(uri,filename,source_id)
    digest=hashlib.sha256(original_bytes).hexdigest()
    expected_path=f'/wp-content/uploads/{year}/{month}/{filename}'
    # Idempotent: reusable only if BOTH path and SHA256 match the source.
    found=api('/wp-json/wp/v2/media?context=edit&per_page=100&search='+urllib.parse.quote(os.path.splitext(filename)[0]))
    assert isinstance(found,list),'Media query invalid'
    for existing in found:
        target_path=urllib.parse.urlparse(str(existing.get('source_url') or '')).path
        if target_path!=expected_path:
            continue
        actual=retrieve_asset(urllib.parse.urljoin(DEST+'/',target_path),filename,source_id)
        if hashlib.sha256(actual).hexdigest()!=digest:
            raise AssetDeferred(uri,filename,source_id,1,'Existing same-path Media has different bytes; never overwrite')
        mid=int(existing['id'])
        image_cache[uri]=(mid,target_path)
        print('AQUA_REMAINING_MEDIA_ORIGINAL_MONTH_REUSED='+json.dumps({'source_id':source_id,
              'target_media_id':mid,'target_path':target_path}),flush=True)
        return mid,target_path
    temp_id=None
    media_id=None
    succeeded=False
    try:
        temp=api('/wp-json/wp/v2/posts',method='POST',obj={
            'title':'[TEMP AQUA MEDIA] '+year+'-'+month+' '+str(source_id),
            'slug':'temp-aqua-media-'+year+month+'-'+str(source_id),
            'date':year+'-'+month+'-01T12:00:00',
            'status':'draft',
            'acf':{'key':'ssr-post','action':'PostDetails'},
        })
        temp_id=int(temp['id'])
        assert temp_id>0 and temp.get('status')=='draft','Temporary post was not saved as draft'
        confirmed=api('/wp-json/wp/v2/posts/'+str(temp_id)+'?context=edit')
        assert str(confirmed.get('date','')).startswith(year+'-'+month+'-01'), 'Backdated temporary post date did not persist'
        upload=api('/wp-json/wp/v2/media?post='+str(temp_id),method='POST',
            raw=original_bytes,headers={
              'Content-Type':mimetypes.guess_type(filename)[0] or 'application/octet-stream',
              'Content-Disposition':'attachment; filename="'+filename+'"',
              'Content-MD5':hashlib.md5(original_bytes).hexdigest()
            })
        media_id=int(upload['id'])
        actual_path=urllib.parse.urlparse(str(upload.get('source_url') or '')).path
        if actual_path!=expected_path:
            # Remove only the attachment just created by this task, not existing media.
            api('/wp-json/wp/v2/media/'+str(media_id)+'?force=true',method='DELETE')
            media_id=None
            raise AssetDeferred(uri,filename,source_id,1,
                'WordPress changed original filename/path: '+actual_path)
        uploaded=retrieve_asset(urllib.parse.urljoin(DEST+'/',actual_path),filename,source_id)
        if hashlib.sha256(uploaded).hexdigest()!=digest:
            api('/wp-json/wp/v2/media/'+str(media_id)+'?force=true',method='DELETE')
            media_id=None
            raise AssetDeferred(uri,filename,source_id,1,'Uploaded media SHA256 differs; deleted own upload')
        api('/wp-json/wp/v2/media/'+str(media_id),method='POST',obj={'post':0,'alt_text':alt or ''})
        detached=api('/wp-json/wp/v2/media/'+str(media_id)+'?context=edit')
        assert int(detached.get('post') or 0)==0, 'Uploaded media still attached to temporary draft'
        image_cache[uri]=(media_id,actual_path)
        journal.setdefault('source_media_original_month',[]).append({
          'source_id':source_id,'source_url':uri,'source_sha256':digest,
          'target_media_id':media_id,'target_path':actual_path,
          'temporary_post_id':temp_id,'mode':'PRESERVED_SOURCE_FILENAME_AND_BYTES'})
        save()
        succeeded=True
        print('AQUA_REMAINING_MEDIA_SOURCE_MONTH_UPLOADED='+json.dumps({
          'source_id':source_id,'source_file':filename,'source_month':year+'-'+month,
          'target_media_id':media_id,'target_path':actual_path}),flush=True)
        return media_id,actual_path
    finally:
        if temp_id is not None:
            try:
                deleted=api('/wp-json/wp/v2/posts/'+str(temp_id)+'?force=true',method='DELETE')
                assert bool(deleted.get('deleted')), 'Temporary draft delete was not acknowledged'
                print('AQUA_REMAINING_TEMP_POST_CLEANUP_PASS='+str(temp_id),flush=True)
            except Exception as cleanup_error:
                journal.setdefault('temp_cleanup_pending',[]).append({
                  'post_id':temp_id,'source_id':source_id,'error':str(cleanup_error)[:250]})
                save()
                raise RuntimeError('TEMP_POST_CLEANUP_FAILED id='+str(temp_id)) from cleanup_error

source_media_regex=re.compile(r'https?://aquathanhxuan\.com/wp-content/uploads/[^\s"\'<>]+',re.I)
# Use an actual resized file created and publicly hosted by original WordPress
# only when the source full filename collides with a *different* target asset.
# We do not rename, overwrite, hash-rename or misattribute another product photo.
def ensure_media(src,alt,source_id,source_media_id=None):
    try:
        return ensure_media_exact(src,alt,source_id)
    except AssetDeferred as original_error:
        if not any(marker in str(original_error).lower() for marker in ('different','renamed original media')):
            raise
        # The original media filename collides globally in the destination,
        # but the historical year/month folder may be free. Try exact bytes
        # there before substituting the original site's resized variants.
        try:
            return ensure_media_in_original_month(src,alt,source_id)
        except AssetDeferred as month_error:
            print('AQUA_REMAINING_MEDIA_MONTH_DEFERRED='+json.dumps({
              'source_id':source_id,'url':src,'error':str(month_error)[:240]},ensure_ascii=False),flush=True)
        if source_media_id is None:
            filename=os.path.basename(urllib.parse.urlparse(src).path)
            stem=re.sub(r'-[0-9]+x[0-9]+\Z','',os.path.splitext(filename)[0])
            entries=get_json(SOURCE+'/wp-json/wp/v2/media?search='+urllib.parse.quote(stem)+'&per_page=100')
            matches=[entry for entry in entries if src==entry.get('source_url') or
                any(size.get('source_url')==src for size in
                    (entry.get('media_details',{}).get('sizes') or {}).values())]
            if len(matches)!=1:
                raise original_error
            media=matches[0]
            source_media_id=int(media['id'])
            print('AQUA_REMAINING_INLINE_MEDIA_ATTACHMENT_VERIFIED='+json.dumps({
                'source_id':source_id,'inline_url':src,'media_id':source_media_id
            },ensure_ascii=False),flush=True)
        else:
            media=get_json(SOURCE+'/wp-json/wp/v2/media/'+str(source_media_id))
        assert int(media.get('id',0))==int(source_media_id),'Source attachment identity changed'
        if not str(media.get('source_url','')).startswith(SOURCE+'/wp-content/uploads/'):
            raise original_error
        sizes=media.get('media_details',{}).get('sizes') or {}
        variants=[]
        full_url=str(media.get('source_url') or '')
        if full_url.startswith(SOURCE+'/wp-content/uploads/') and full_url!=src:
            variants.append(full_url)
        for name in ('large','woocommerce_single','medium_large','medium','woocommerce_thumbnail'):
            info=sizes.get(name) or {}
            url=str(info.get('source_url') or '')
            if url.startswith(SOURCE+'/wp-content/uploads/') and url!=src and url not in variants:
                variants.append(url)
        print('AQUA_REMAINING_ORIGINAL_FILENAME_COLLISION='+json.dumps({'source_id':source_id,'attachment_id':source_media_id,
            'source_url':src,'variants':variants},ensure_ascii=False),flush=True)
        for url in variants:
            try:
                mid,path=ensure_media_exact(url,alt,source_id)
                print('AQUA_REMAINING_MEDIA_SOURCE_VARIANT_USED='+json.dumps({'source_id':source_id,
                     'source_media_id':source_media_id,'variant_url':url,'saved_as':path,'target_media_id':mid},ensure_ascii=False),flush=True)
                journal.setdefault('source_media_variants',[]).append({
                    'source_id':source_id,'source_media_id':source_media_id,
                    'original_full_url':src,'actual_source_variant_url':url,
                    'target_media_id':mid,'target_path':path,
                    'original_full_image_status':'DEFERRED_ORIGINAL_FILENAME_CONFLICT'})
                save()
                return mid,path
            except AssetDeferred:
                continue
        raise original_error

def localize_html(value,source_id,source_media_by_url=None):
    content=str(value or '')
    matches=list(dict.fromkeys(source_media_regex.findall(content)))
    for uri in matches:
        # HTML may escape query separators or contain URL fragments.
        original_uri=html.unescape(uri)
        parsed=urllib.parse.urlparse(original_uri)
        canonical=parsed._replace(query='',fragment='').geturl()
        original_attachment_id=(source_media_by_url or {}).get(canonical)
        media_id,path=ensure_media(canonical,'',source_id,original_attachment_id)
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
    source_media_by_url={str(item.get('src') or ''):item.get('id')
      for item in (src.get('images') or []) if item.get('src') and item.get('id')}
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
        # Existing products may have been imported before source content/gallery
        # migration was introduced. Only fill genuinely absent content.
        if not str(existing.get('description') or '').strip() and str(src.get('description') or '').strip():
            updates['description']=localize_html(src['description'],source_id,source_media_by_url)
        if not str(existing.get('short_description') or '').strip() and str(src.get('short_description') or '').strip():
            updates['short_description']=localize_html(src['short_description'],source_id,source_media_by_url)
        existing_images=existing.get('images') or []
        existing_media_names=set()
        for item in existing_images:
            current_src=str(item.get('src') or '')
            filename=os.path.basename(urllib.parse.unquote(urllib.parse.urlparse(current_src).path))
            if filename:existing_media_names.add(filename)
        append_images=[]
        for item in src.get('images') or []:
            uri=str(item.get('src') or '')
            if not uri: continue
            source_name=os.path.basename(urllib.parse.unquote(urllib.parse.urlparse(uri).path))
            if source_name in existing_media_names:continue
            media_id,_=ensure_media(uri,item.get('alt') or name,source_id,item.get('id'))
            append_images.append({'id':media_id,'alt':item.get('alt') or name})
            existing_media_names.add(source_name)
        if append_images:
            # Preserve the existing cover and its custom ordering/alt.
            updates['images']=[{'id':int(x['id']),'alt':str(x.get('alt') or '')} for x in existing_images]+append_images
        if updates:
            existing=api('/wp-json/wc/v3/products/'+str(existing['id']),method='POST',obj=updates)
            if 'categories' in updates:journal['category_linked']+=1
        target_id=int(existing['id'])
        ensure_locale(target_id)
        if updates.get('description') or updates.get('short_description') or updates.get('images'):
            print('AQUA_REMAINING_PRODUCT_ENRICHED='+json.dumps({
              'id':target_id,'slug':slug,'description':bool(updates.get('description')),
              'short_description':bool(updates.get('short_description')),
              'gallery_added':len(append_images)
            },ensure_ascii=False),flush=True)
        result='reused'
        journal['reused']+=1
    else:
        images=[]
        original_images=src.get('images') or []
        assert original_images,'Published source product has no image'
        for item in original_images:
            uri=item.get('src') or ''
            if not uri: continue
            mid,path=ensure_media(uri,item.get('alt') or name,source_id,item.get('id'))
            images.append({'id':mid,'alt':item.get('alt') or name})
        assert images,'Cannot import without original product media'
        description=localize_html(src.get('description') or '',source_id,source_media_by_url)
        short_description=localize_html(src.get('short_description') or '',source_id,source_media_by_url)
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
        print('AQUA_REMAINING_PRODUCT_CREATED='+json.dumps({'source_id':source_id,'target_id':target_id,'slug':slug}),flush=True)
    check=api('/wp-json/wc/v3/products/'+str(target_id))
    assert check['slug']==slug and normalize(check['name'])==normalize(name),'Target identity check failed'
    assert set(info['brands']).issubset({int(c['id']) for c in check.get('categories') or []}), 'Target verified category link absent'
    assert check.get('images') and int(check['images'][0]['id'])>0, 'Missing source media not labeled'
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
        print('AQUA_REMAINING_ASSET_DEFERRED='+json.dumps(e.record,ensure_ascii=False),flush=True)
    except Exception as e:
        journal['failed']+=1
        journal['products'].append({'source_id':source_id,'slug':info['slug'],'status':'FAILED','error':str(e)})
        for brand in journal['brands']:
            if brand['target_id'] in info['brands']:brand['deferred']+=1
        print('AQUA_REMAINING_PRODUCT_FAILED='+json.dumps({'source_id':source_id,'slug':info['slug'],'error':str(e)[:220]},ensure_ascii=False),flush=True)
    save()

journal['finished_at']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
journal['status']='PASS' if journal['failed']==0 and len(journal['products'])==len(source_product_groups) else 'PARTIAL'
save()
print('AQUA_REMAINING_MIGRATION_RESULT='+json.dumps({'batch':BATCH,'status':journal['status'],
    'expected':len(source_product_groups),'created':journal['created'],'reused':journal['reused'],
    'category_linked':journal['category_linked'],'failed':journal['failed'],
    'deferred_ids':[x['source_id'] for x in journal['products'] if x['status'] in ('FAILED','ASSET_DEFERRED')]},ensure_ascii=False),flush=True)
if journal['status']!='PASS':raise SystemExit(1)
