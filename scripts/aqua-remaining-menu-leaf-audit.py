#!/usr/bin/env python3
"""READ_ONLY: confirm menu-only Woo child terms not present in legacy root taxonomy.
Product title search is diagnostic only, NEVER a basis for automatic category writes.
"""
import html,http.cookiejar,json,os,re,urllib.parse,urllib.request,urllib.error,time
from pathlib import Path
SOURCE='https://aquathanhxuan.com'
TARGET='https://admin.aquathanhxuan.io.vn'
SUSPECT=[
 ("Máy lọc","Eheim",1809,1769),
 ("Phụ kiện","Đèn UV",2012,1771),
 ("Đá / Lũa / Cát","Bonsai",1994,1772),
 ("Bể kính","Bể đúc",909,1774),
 ("Nền","Contro Soil",972,1775),
 ("Sinh vật","Cá thủy sinh",618,1777),
]
PATH=Path('artifacts/aqua-remaining-menu-gap')
PATH.mkdir(parents=True,exist_ok=True)
report={'source':SOURCE,'target':TARGET,'read_only':True,'candidates':[],'status':'STARTED'}
def save():(PATH/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
save()
assert os.environ.get('WP_ADMIN_USERNAME') and os.environ.get('WP_ADMIN_PASSWORD')
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders=[('User-Agent','AquaMenuGapAudit/1.0')]
def raw(url,method='GET',data=None,headers=None):
 for i in range(3):
  try:
   with opener.open(urllib.request.Request(url,data=data,method=method,headers=headers or {}),timeout=45) as r:return r.read()
  except urllib.error.HTTPError as e:
   if method=='GET' and e.code in (429,500,502,503,504) and i<2:time.sleep(i+1);continue
   raise
  except (TimeoutError,urllib.error.URLError,OSError):
   if method=='GET' and i<2:time.sleep(i+1);continue
   raise
def source(url):return json.loads(raw(SOURCE+url,headers={'Cache-Control':'no-cache'}))
def norm(v):return ''.join(html.unescape(re.sub('<[^>]*>',' ',str(v or ''))).casefold().split())
def pages(get,base):
 out=[]
 for pg in range(1,40):
  rows=get(base+('&' if '?' in base else '?')+'per_page=100&page='+str(pg))
  assert isinstance(rows,list)
  out+=rows
  if len(rows)<100:return out
 raise RuntimeError('Pagination limit '+base)
source_terms=pages(source,'/wp-json/wc/store/v1/products/categories')
raw(TARGET+'/wp-login.php')
payload=urllib.parse.urlencode({'log':os.environ['WP_ADMIN_USERNAME'],'pwd':os.environ['WP_ADMIN_PASSWORD'],
'wp-submit':'Log In','redirect_to':TARGET+'/wp-admin/','testcookie':'1'}).encode()
dashboard=raw(TARGET+'/wp-login.php','POST',payload,{'Content-Type':'application/x-www-form-urlencoded'}).decode('utf-8','replace')
assert 'wp-admin-bar-my-account' in dashboard,'Target WP login failed'
m=re.search(r'wpApiSettings\s*=\s*(\{.*?\})\s*;',dashboard,re.S)
nonce=''
if m:
 try:nonce=json.loads(m.group(1)).get('nonce','')
 except ValueError:pass
if not nonce:
 m=re.search(r'"nonce"\s*:\s*"([A-Za-z0-9]+)"',dashboard);nonce=m.group(1) if m else ''
assert nonce
def dest(url):return json.loads(raw(TARGET+url,headers={'X-WP-Nonce':nonce}))
target_terms=pages(dest,'/wp-json/wc/v3/products/categories')
for root,label,sid,tid in SUSPECT:
 src=[x for x in source_terms if int(x.get('parent') or 0)==sid and norm(x.get('name'))==norm(label)]
 dst=[x for x in target_terms if int(x.get('parent') or 0)==tid and norm(x.get('name'))==norm(label)]
 results=pages(source,'/wp-json/wc/store/v1/products?search='+urllib.parse.quote(label))
 candidates=[]
 for p in results:
  if norm(label) not in norm(p.get('name')):continue
  terms=[{'id':t.get('id'),'name':t.get('name')} for t in p.get('categories') or []]
  candidates.append({'id':p.get('id'),'slug':p.get('slug'),'name':p.get('name'),'categories':terms})
 item={'root':root,'label':label,'source_root_id':sid,'target_root_id':tid,
       'source_child_ids':[x['id'] for x in src],
       'target_child_ids':[x['id'] for x in dst],
       'source_name_search_count':len(candidates),'source_title_candidates':candidates[:20],
       'status':'NO_AUTOMATIC_RECLASSIFICATION'}
 report['candidates'].append(item)
 print('AQUA_MENU_SOURCE_GAP='+json.dumps(item,ensure_ascii=False),flush=True)
 save()
report['verified_special_products']=[]
for sid,slug,required_name,required_source_category in [
 (5054,'den-uv-30w','Đèn UV Gebo 30W',None),
 (4355,'den-uv-40w','Đèn UV Gebo 40W',None),
 (3321,'cay-bonsai-to','Cây Bonsai',2058),
]:
 p=source('/wp-json/wc/store/v1/products/'+str(sid))
 assert int(p['id'])==sid and p['slug']==slug and norm(p['name'])==norm(required_name) and p['type']=='simple','Source Product identity drift '+str(sid)
 cats={int(c['id']) for c in p.get('categories') or []}
 if required_source_category is None:assert not cats,'Original category-less UV Product was reclassified; review'
 else:assert required_source_category in cats,'Bonsai no longer in original Đá category'
 item={'source_id':sid,'slug':slug,'name':p['name'],'source_category_ids':sorted(cats),
       'image_count':len(p.get('images') or []),'stock':p.get('is_in_stock'),
       'price':(p.get('prices') or {}).get('price'),'regular_price':(p.get('prices') or {}).get('regular_price'),
       'has_long_description':bool(str(p.get('description') or '').strip()),
       'has_short_description':bool(str(p.get('short_description') or '').strip())}
 report['verified_special_products'].append(item)
 print('AQUA_VERIFIED_SPECIAL_PRODUCT='+json.dumps(item,ensure_ascii=False),flush=True)
 save()
report['status']='PASS'
save()
print('AQUA_MENU_SOURCE_GAP_AUDIT_PASS='+str(len(report['candidates'])),flush=True)
