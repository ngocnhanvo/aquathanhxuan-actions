'use strict';
const { chromium }=require('playwright');
const fs=require('node:fs');
const crypto=require('node:crypto');
const SRC='https://aquathanhxuan.com',WP='https://admin.aquathanhxuan.io.vn';
const sources=[{id:3178,slug:'su-ista-active-bio-pearl'},{id:15280,slug:'bom-jecod-fa-1000'}];
const out='artifacts/brand-asset-diagnostics';fs.mkdirSync(out,{recursive:true});
const journal={time:new Date().toISOString(),records:[]};
const save=()=>fs.writeFileSync(out+'/result.json',JSON.stringify(journal,null,2)+'\n');
async function fetchAsset(url){
 try{
  const r=await fetch(url,{signal:AbortSignal.timeout(18000)});
  const contentType=r.headers.get('content-type');
  if(!r.ok)return {url,status:r.status,contentType};
  const bytes=Buffer.from(await r.arrayBuffer());
  return{url,status:r.status,contentType,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 }catch(e){return{url,error:String(e).slice(0,190)}}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
   const page=await browser.newPage();
   await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:50000});
   if(await page.locator('#user_login').count()){
    await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
    await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
    await page.locator('#wp-submit').click();
   }
   await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
   const res=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
   const nonce=(await res.text()).trim();
   const headers={'X-WP-Nonce':nonce};
   for(const item of sources){
      const r=await fetch(SRC+'/wp-json/wc/store/v1/products/'+item.id,{signal:AbortSignal.timeout(22000)});
      if(!r.ok)throw Error('Source product status '+r.status+' id '+item.id);
      const product=await r.json();
      const rec={id:item.id,slug:product.slug,name:product.name,images:product.images,descriptionImages:[],legacyMedia:[],assets:[],targetMedia:[]};
      for(const field of [product.description||'',product.short_description||'']){
       for(const found of [...String(field).matchAll(/(?:src|srcset)="([^"]+)"/g)]){
         if(found[1].includes('/wp-content/uploads/'))rec.descriptionImages.push(found[1].slice(0,400));
       }
      }
      const urls=new Set();
      for(const image of product.images||[]){
        if(image.src)urls.add(image.src);
        if(image.thumbnail)urls.add(image.thumbnail);
        if(image.srcset)for(const part of String(image.srcset).split(',')){
          const u=part.trim().split(' ')[0];
          if(u.startsWith('http'))urls.add(u);
        }
        const mid=image.id;
        if(mid){
          const req=await fetch(SRC+'/wp-json/wp/v2/media/'+mid,{signal:AbortSignal.timeout(20000)});
          if(req.ok){
           const media=await req.json();
           rec.legacyMedia.push({id:mid,source_url:media.source_url,guid:media.guid?.rendered,media_details:media.media_details?.sizes?Object.entries(media.media_details.sizes).map(([size,v])=>({size,source_url:v.source_url,file:v.file})):null});
           if(media.source_url)urls.add(media.source_url);
           for(const v of Object.values(media.media_details?.sizes||{})){if(v.source_url)urls.add(v.source_url)}
          }else rec.legacyMedia.push({id:mid,status:req.status});
        }
      }
      const searchNames=[...new Set((product.images||[]).map(x=>decodeURIComponent(new URL(x.src).pathname.split('/').pop()||'')))];
      for(const name of searchNames){
        const stem=name.split('.')[0];
        const search=await page.request.get(WP+'/wp-json/wp/v2/media?context=edit&per_page=100&search='+encodeURIComponent(stem),{headers,timeout:30000});
        if(search.ok()){
         const items=await search.json();
         for(const m of items.filter(x=>decodeURIComponent(new URL(x.source_url).pathname).endsWith('/'+name))){
            rec.targetMedia.push({id:m.id,source_url:m.source_url,original_image:m.media_details?.original_image,media_details:m.media_details?.sizes?Object.keys(m.media_details.sizes):[]});
            urls.add(m.source_url);
         }
        }
      }
      const pageR=await fetch(SRC+'/san-pham/'+product.slug+'/',{signal:AbortSignal.timeout(25000)});
      rec.legacyProductPage={status:pageR.status};
      if(pageR.ok()){
        const html=await pageR.text();
        const imgs=[...html.matchAll(/<img\b[^>]*>/g)].map(x=>x[0]).filter(x=>/src=|srcset=/.test(x)).slice(0,30);
        rec.legacyProductPage.imageHtml=imgs.filter(x=>/ista|jecod|thiet-ke|placeholder/i.test(x)).slice(0,14);
        for(const h of imgs){
          for(const match of [...h.matchAll(/(?:src|data-src|data-lazy-src)="([^"]+)"/g)]){
           const u=match[1];if(u.startsWith(SRC+'/wp-content/uploads'))urls.add(u);
          }
        }
      }
      for(const url of urls)rec.assets.push(await fetchAsset(url));
      journal.records.push(rec);save();
      console.log('BRAND_ASSET_DIAGNOSTIC='+JSON.stringify({id:rec.id,slug:rec.slug,sourceImageCount:rec.images.length,targetMedia:rec.targetMedia,legacyMedia:rec.legacyMedia,assets:rec.assets,descriptionImages:rec.descriptionImages,legacyProductPage:rec.legacyProductPage}).slice(0,30000));
   }
 }finally{await browser.close()}
})().catch(e=>{journal.error=String(e.stack||e);save();console.error('BRAND_ASSET_DIAGNOSTIC_FAIL='+journal.error);process.exitCode=1});
