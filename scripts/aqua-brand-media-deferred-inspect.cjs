'use strict';
const {chromium}=require('playwright');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const WP='https://admin.aquathanhxuan.io.vn';
const SOURCE='https://aquathanhxuan.com';
const ids=[3178,15280];
const fetchBytes=async(url)=>{
  try{
    const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
    const buf=Buffer.from(await r.arrayBuffer());
    return {status:r.status,len:buf.length,sha:r.ok?crypto.createHash('sha256').update(buf).digest('hex'):undefined,contentType:r.headers.get('content-type'),body:r.ok?buf:undefined};
  }catch(e){return {error:String(e).slice(0,220)}}
};
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage();
await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
if(await page.locator('#user_login').count()){
 await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
 await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
 await page.locator('#wp-submit').click();
}
await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
const nonceR=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');assert.equal(nonceR.status(),200);const nonce=(await nonceR.text()).trim(),headers={'X-WP-Nonce':nonce};
for(const id of ids){
 const sr=await fetch(SOURCE+'/wp-json/wc/store/v1/products/'+id,{signal:AbortSignal.timeout(20000)});
 assert.equal(sr.status,200);
 const product=await sr.json();
 const slug=product.slug;
 const imgs=product.images||[];
 console.log('BRAND_ASSET_ORIGINAL='+JSON.stringify({id,slug,name:product.name,images:imgs.map(x=>({id:x.id,src:x.src,thumbnail:x.thumbnail,srcset:x.srcset,alt:x.alt}))}).slice(0,16000));
 const html=await fetch(SOURCE+'/san-pham/'+slug+'/',{signal:AbortSignal.timeout(20000)});
 const text=await html.text();
 const sourceUrls=[...new Set(text.match(/https?:\/\/aquathanhxuan\.com\/wp-content\/uploads\/[^"'\s<>]+/gi)||[])].slice(0,30);
 console.log('BRAND_ASSET_HTML='+JSON.stringify({id,status:html.status,slug,mediaUrls:sourceUrls}).slice(0,16000));
 for(const img of imgs){
   for(const [key,url] of [['src',img.src],['thumbnail',img.thumbnail]]){
     if(!url)continue;
     const r=await fetchBytes(url);
     console.log('BRAND_ASSET_SOURCE_PROBE='+JSON.stringify({id,key,url,status:r.status,len:r.len,sha:r.sha,type:r.contentType,error:r.error}));
   }
 }
 for(const img of imgs){
   const filename=decodeURIComponent(new URL(img.src).pathname.split('/').pop());
   const stem=filename.replace(/\\.[^.]+$/,'');
   const m=await page.request.get(WP+'/wp-json/wp/v2/media?context=edit&per_page=100&search='+encodeURIComponent(stem),{headers,timeout:25000});
   console.log('BRAND_ASSET_MEDIA_SEARCH='+JSON.stringify({id,filename,status:m.status(),media:(await m.json()).map(z=>({id:z.id,slug:z.slug,src:z.source_url,details:z.media_details?.width+'x'+z.media_details?.height})).slice(0,20)}).slice(0,10000));
   if(m.status()===200)for(const z of await m.json()){
     const zp=decodeURIComponent(new URL(z.source_url).pathname.split('/').pop());
     if(zp!==filename)continue;
     const r=await fetchBytes(z.source_url);
     console.log('BRAND_ASSET_TARGET_PROBE='+JSON.stringify({id,filename,targetId:z.id,url:z.source_url,status:r.status,len:r.len,sha:r.sha,type:r.contentType,error:r.error}));
   }
 }
 const products=await page.request.get(WP+'/wp-json/wc/v3/products?status=any&slug='+encodeURIComponent(slug),{headers,timeout:25000});
 console.log('BRAND_ASSET_EXISTING_PRODUCT='+JSON.stringify({id,slug,status:products.status(),matches:(await products.json()).map(z=>({id:z.id,slug:z.slug,images:z.images.length,categories:z.categories.map(c=>c.id)}))}));
}
}finally{await browser.close()}
})().catch(e=>{console.error('BRAND_ASSET_DIAG_FAIL='+e.stack);process.exitCode=1});
