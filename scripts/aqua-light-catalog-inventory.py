#!/usr/bin/env python3
"""READ_ONLY inventory of actual source and destination WooCommerce light categories."""
import http.cookiejar, html, json, os, re, urllib.parse, urllib.request
from pathlib import Path

SOURCE='https://aquathanhxuan.com'
DEST='https://admin.aquathanhxuan.io.vn'
LABELS=['WeekAqua','Chihiros','Neo Helios','Xuanmailong','Kaokui','Odyssea','Phụ kiện đèn']
username=os.environ['WP_ADMIN_USERNAME']
password=os.environ['WP_ADMIN_PASSWORD']
env=dict(line.split('=',1) for line in os.environ.get('ENV_FILE','').splitlines() if '=' in line and not line.lstrip().startswith('#'))
assert env.get('WC_URL','').strip('"\\\'')==DEST, 'Destination host mismatch'
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders=[('User-Agent','AquaLightInventory/1.0')]
def get(url,headers=None):
    with opener.open(urllib.request.Request(url,headers=headers or {}),timeout=70) as r:
        return r.read().decode('utf-8','replace')
def source(path):return json.loads(get(SOURCE+path))
def normal(s):return ''.join(html.unescape(re.sub('<[^>]*>',' ',str(s or ''))).casefold().split())
def pages(url,max_pages=30,headers=None):
    result=[]
    for p in range(1,max_pages+1):
        rows=json.loads(get(url+('&' if '?' in url else '?')+'per_page=100&page='+str(p),headers))
        assert isinstance(rows,list),'Invalid pagination: '+url
        result.extend(rows)
        if len(rows)<100:break
    return result
get(DEST+'/wp-login.php')
payload=urllib.parse.urlencode({'log':username,'pwd':password,'wp-submit':'Log In','redirect_to':DEST+'/wp-admin/','testcookie':'1'}).encode()
dashboard=opener.open(urllib.request.Request(DEST+'/wp-login.php',data=payload,headers={'Content-Type':'application/x-www-form-urlencoded'}),timeout=65).read().decode('utf-8','replace')
assert 'wp-admin-bar-my-account' in dashboard,'Destination WordPress login failed'
nonce=''
m=re.search(r'wpApiSettings\s*=\s*(\{.*?\})\s*;',dashboard,re.S)
if m:
    try:nonce=json.loads(m.group(1)).get('nonce','')
    except json.JSONDecodeError:pass
if not nonce:
    m=re.search(r'"nonce"\s*:\s*"([A-Za-z0-9]+)"',dashboard)
    nonce=m.group(1) if m else ''
assert nonce,'Missing authorized WP REST nonce'
def target(path):return json.loads(get(DEST+path,{'X-WP-Nonce':nonce}))
src_cats=pages(SOURCE+'/wp-json/wc/store/v1/products/categories')
dst_cats=pages(DEST+'/wp-json/wc/v3/products/categories',headers={'X-WP-Nonce':nonce})
src_roots=[c for c in src_cats if c.get('slug')=='den' and not int(c.get('parent') or 0)]
dst_roots=[c for c in dst_cats if c.get('slug')=='den' and not int(c.get('parent') or 0)]
assert len(src_roots)==len(dst_roots)==1,'Missing or ambiguous light root'
sr,dr=src_roots[0],dst_roots[0]
pairs=[]
for label in LABELS:
    a=[c for c in src_cats if int(c.get('parent') or 0)==int(sr['id']) and normal(c.get('name'))==normal(label)]
    b=[c for c in dst_cats if int(c.get('parent') or 0)==int(dr['id']) and normal(c.get('name'))==normal(label)]
    assert len(a)==len(b)==1, 'Category mapping ambiguous/missing '+label+': '+str(([x.get('slug') for x in a],[x.get('slug') for x in b]))
    pairs.append((label,a[0],b[0]))
results=[]
unique={}
for label,sc,dc in [('Tất cả',sr,dr)]+pairs:
    listings=pages(SOURCE+'/wp-json/wc/store/v1/products?category='+str(sc['id']),max_pages=25)
    types={}
    existing=0
    missing=[]
    for item in listings:
        types[item.get('type')]=types.get(item.get('type'),0)+1
        sid=int(item['id'])
        assert item.get('slug') and item.get('name'), 'Source Product identity missing'
        match=target('/wp-json/wc/v3/products?status=any&per_page=100&slug='+urllib.parse.quote(item['slug']))
        assert isinstance(match,list) and len(match)<2,'Target slug ambiguous '+str(item['slug'])
        found=bool(match)
        if found:existing+=1
        else:missing.append({'source_id':sid,'slug':item['slug'],'type':item.get('type')})
        slot=unique.setdefault(sid,{'id':sid,'slug':item['slug'],'name':item['name'],'type':item.get('type'),'categories':[],'exists':found})
        assert slot['slug']==item['slug'] and slot['exists']==found
        slot['categories'].append({'source_id':int(sc['id']),'target_id':int(dc['id']),'name':label,'source_slug':sc['slug'],'target_slug':dc['slug']})
    summary={'name':label,'source_category_id':sc['id'],'source_slug':sc['slug'],'target_category_id':dc['id'],'target_slug':dc['slug'],'source_count':len(listings),'already_in_target':existing,'missing_count':len(missing),'types':types,'missing':missing}
    results.append(summary)
    print('LIGHT_INVENTORY_CATEGORY='+json.dumps({k:v for k,v in summary.items() if k!='missing'},ensure_ascii=False),flush=True)
assert all(x['type']=='simple' for x in unique.values()),'Variable products need dedicated strategy; inventory only'
out={'source':SOURCE,'target':DEST,'source_root':sr['id'],'target_root':dr['id'],'categories':results,'unique_products':list(unique.values()),'unique_count':len(unique),'unique_missing':sum(not x['exists'] for x in unique.values()),'read_only':True}
Path('artifacts/aqua-light').mkdir(parents=True,exist_ok=True)
Path('artifacts/aqua-light/inventory.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('LIGHT_INVENTORY_PASS='+json.dumps({'source_unique':out['unique_count'],'target_missing':out['unique_missing'],'categories':len(results)},ensure_ascii=False),flush=True)
