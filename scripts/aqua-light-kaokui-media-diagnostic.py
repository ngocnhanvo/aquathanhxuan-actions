#!/usr/bin/env python3
"""Read-only exact source/destination media SHA comparison for Kaokui 350144."""
import hashlib,json,urllib.error,urllib.request,urllib.parse
from pathlib import Path
SOURCE='https://aquathanhxuan.com'
DEST='https://admin.aquathanhxuan.io.vn'
PRODUCT=350144
SLUG='den-kaokui-70w-pro-2'
path='/wp-content/uploads/2026/06/kaokui2-300x300.jpg'
def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'AquaLightKaokuiMediaAudit/1.0'}),timeout=45) as r:
            payload=r.read()
            return {'status':r.status,'sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload)}
    except urllib.error.HTTPError as e:return {'status':e.code}
    except Exception as e:return {'status':'network-error','error':str(e)[:150]}
src=json.loads(urllib.request.urlopen(SOURCE+'/wp-json/wc/store/v1/products/'+str(PRODUCT),timeout=45).read())
assert int(src['id'])==PRODUCT and src['slug']==SLUG
report={'source_id':PRODUCT,'slug':SLUG,'source_media':get(SOURCE+path),'target_media':get(DEST+path),
        'source_main_images':[{'id':x.get('id'),'src':x.get('src')} for x in src.get('images') or []],
        'embedded_in_description':SOURCE+path in str(src.get('description') or '')+str(src.get('short_description') or '')}
report['exact_match']=report['source_media'].get('status')==200 and report['source_media'].get('sha256')==report['target_media'].get('sha256')
Path('artifacts/aqua-light-kaokui').mkdir(parents=True,exist_ok=True)
Path('artifacts/aqua-light-kaokui/diagnostic.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('LIGHT_KAOKUI_MEDIA_DIAGNOSTIC='+json.dumps(report,ensure_ascii=False),flush=True)
