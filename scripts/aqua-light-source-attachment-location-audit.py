#!/usr/bin/env python3
"""READ_ONLY: check whether two verified broken legacy attachments live at the source's actual month."""
import json,urllib.request,urllib.parse,urllib.error,re,struct,hashlib
from pathlib import Path

SOURCE='https://aquathanhxuan.com'
IDS=(266690,266681)
OUT=Path('artifacts/aqua-light-source-attachment-audit')
OUT.mkdir(parents=True,exist_ok=True)
def download(url, limit=6500000):
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'AquaLightSourceAttachmentAudit/1.0','Cache-Control':'no-cache'})
        with urllib.request.urlopen(req,timeout=40) as response:
            blob=response.read(limit)
            return {'status':response.status,'blob':blob}
    except urllib.error.HTTPError as exc:return {'status':exc.code}
    except Exception as exc:return {'status':'network-error','error':str(exc)[:250]}

results=[]
for mid in IDS:
    r=download(SOURCE+'/wp-json/wp/v2/media/'+str(mid))
    assert r.get('status')==200,'Missing verified source attachment ID '+str(mid)
    media=json.loads(r['blob'].decode('utf-8'))
    assert int(media.get('id',0))==mid and media.get('media_type')=='image'
    source_url=str(media.get('source_url') or '')
    original_path=urllib.parse.urlparse(source_url).path
    assert original_path.startswith('/wp-content/uploads/'),'Unexpected source URL'
    basename=original_path.rsplit('/',1)[-1]
    assert basename.lower().endswith('.png'),'Unexpected file type'
    ym=set()
    match=re.search(r'(20\d{2})-(0[1-9]|1[0-2])-\d{2}',basename)
    if match:ym.add((match.group(1),match.group(2),'filename-embedded-date'))
    for key in ('date','date_gmt','modified','modified_gmt'):
        d=str(media.get(key) or '')
        match=re.match(r'(20\d{2})-(0[1-9]|1[0-2])-',d)
        if match:ym.add((match.group(1),match.group(2),'attachment-'+key))
    candidates=[(source_url,'source_url')]
    for year,month,why in sorted(ym):
        url=SOURCE+'/wp-content/uploads/'+year+'/'+month+'/'+basename
        if url!=source_url and url not in [candidate for candidate,_ in candidates]:
            candidates.append((url,why))
    expected_width=int((media.get('media_details') or {}).get('width') or 0)
    expected_height=int((media.get('media_details') or {}).get('height') or 0)
    item={'attachment_id':mid,'source_url':source_url,'filename':basename,
          'date':media.get('date'),'media_details_file':(media.get('media_details') or {}).get('file'),
          'expected_dimensions':[expected_width,expected_height], 'candidates':[]}
    for url,why in candidates:
        response=download(url)
        out={'url':url,'reason':why,'status':response['status']}
        if 'blob' in response:
            blob=response['blob']
            out['png_signature']=blob.startswith(b'\x89PNG\r\n\x1a\n')
            if out['png_signature'] and len(blob)>=24:
                w,h=struct.unpack('>II',blob[16:24])
                out['actual_dimensions']=[w,h]
                out['dimensions_match']=w==expected_width and h==expected_height
                out['sha256']=hashlib.sha256(blob).hexdigest()
            else:
                out['dimensions_match']=False
        if 'error' in response:out['error']=response['error']
        item['candidates'].append(out)
    results.append(item)
    print('LIGHT_ATTACHMENT_LOCATION='+json.dumps(item,ensure_ascii=False),flush=True)
(OUT/'result.json').write_text(json.dumps({'read_only':True,'source':SOURCE,'results':results},ensure_ascii=False,indent=2)+'\n')
print('LIGHT_ATTACHMENT_LOCATION_AUDIT_PASS='+json.dumps({'checked':len(results),'origin':SOURCE}),flush=True)
