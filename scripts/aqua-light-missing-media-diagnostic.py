#!/usr/bin/env python3
"""Read-only actual source evidence for exact failed light Product IDs."""
import html, json, re, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path
from html.parser import HTMLParser

ORIGIN='https://aquathanhxuan.com'
IDS=[1815,3054,3057,3060,3063]
class HeadParser(HTMLParser):
  def __init__(self):
    super().__init__()
    self.meta=[]
    self.images=[]
  def handle_starttag(self,tag,attrs):
    d=dict(attrs)
    if tag=='meta' and d.get('property') in ('og:image','og:image:url'):
      self.meta.append(d.get('content',''))
    if tag=='img':
      candidate={k:d.get(k) for k in ('src','data-src','data-large_image','srcset','class') if d.get(k)}
      if candidate:self.images.append(candidate)
def raw(url,limit=None):
  req=urllib.request.Request(url,headers={'User-Agent':'AquaSourceMediaReadOnly/1.0'})
  with urllib.request.urlopen(req,timeout=40) as r:
    return r.read(limit or 5000000)
def jsonget(url):return json.loads(raw(url).decode('utf-8','replace'))
def check(url):
  try:
    blob=raw(url,60)
    good=blob.startswith((b'\\x89PNG\\r\\n',b'\\xff\\xd8\\xff',b'RIFF',b'GIF8',b'\\x00\\x00\\x00'))
    return {'url':url,'status':200,'looks_like_image':good,'size_preview':len(blob)}
  except urllib.error.HTTPError as e:
    return {'url':url,'status':e.code}
  except Exception as e:
    return {'url':url,'status':'network-error','error':str(e)[:100]}
rows=[]
for sid in IDS:
  src=jsonget(ORIGIN+'/wp-json/wc/store/v1/products/'+str(sid))
  assert int(src['id'])==sid
  item={'id':sid,'slug':src['slug'],'name':html.unescape(re.sub('<[^>]*>',' ',src.get('name') or '')),
        'images':[],'description_image_urls':[],'detail_gallery':[],'product_type':src.get('type')}
  for image in src.get('images') or []:
    entry={'media_id':image.get('id'),'src':image.get('src'),'src_check':check(image.get('src')) if image.get('src') else None,'source_sizes':[]}
    mid=image.get('id')
    if mid:
      try:
        media=jsonget(ORIGIN+'/wp-json/wp/v2/media/'+str(mid))
        for kind,size in (media.get('media_details',{}).get('sizes') or {}).items():
          url=size.get('source_url') or ''
          if url and url.startswith(ORIGIN+'/wp-content/uploads/'):
            entry['source_sizes'].append({'kind':kind,**check(url)})
      except Exception as e:entry['media_meta_error']=str(e)[:170]
    item['images'].append(entry)
  for u in re.findall(r'https?://aquathanhxuan\\.com/wp-content/uploads/[^\\s"\\'<>]+',str(src.get('description') or '')+' '+str(src.get('short_description') or '')):
    url=html.unescape(u).split('?',1)[0]
    if url not in item['description_image_urls']:
      item['description_image_urls'].append(url)
  detail=raw(ORIGIN+'/san-pham/'+urllib.parse.quote(src['slug'])+'/').decode('utf-8','replace')
  parser=HeadParser()
  parser.feed(detail)
  item['og_images']=[check(u) for u in parser.meta[:4] if u.startswith(ORIGIN+'/wp-content/uploads/')]
  for i in parser.images:
    large=i.get('data-large_image') or i.get('data-src') or i.get('src') or ''
    if large.startswith(ORIGIN+'/wp-content/uploads/'):
      item['detail_gallery'].append({'src':large,'check':check(large),'class':i.get('class','')})
    if len(item['detail_gallery'])>=8:break
  item['description_images_checked']=[check(u) for u in item['description_image_urls'][:8]]
  rows.append(item)
  print('LIGHT_SOURCE_MEDIA_DIAGNOSTIC='+json.dumps({
    'source_id':sid,'slug':src['slug'],'store_images':len(item['images']),
    'live_store_images':sum(bool(x.get('src_check',{}).get('looks_like_image')) for x in item['images']),
    'live_resized_images':sum(bool(y.get('looks_like_image')) for x in item['images'] for y in x['source_sizes']),
    'description_images':len(item['description_image_urls']),
    'live_description_images':sum(bool(x.get('looks_like_image')) for x in item['description_images_checked']),
    'detail_gallery_images':len(item['detail_gallery'])
  },ensure_ascii=False),flush=True)
  time.sleep(.15)
out=Path('artifacts/aqua-light-media-diagnostic')
out.mkdir(parents=True,exist_ok=True)
(out/'result.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('LIGHT_MEDIA_READ_ONLY_COMPLETE='+str(len(rows)),flush=True)
