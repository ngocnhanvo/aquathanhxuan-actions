'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const SRC='https://aquathanhxuan.com',WP='https://admin.aquathanhxuan.io.vn';
const ids=[267204,265771,265770,265769,265768,265767,265762,265405,265403,265398];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchJson(url){
  let last;
  for(let t=0;t<4;t++){
    try{
      const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'Cache-Control':'no-cache'}});
      if(!r.ok)throw Error('HTTP '+r.status+' '+url);
      return await r.json();
    }catch(e){last=e;if(t<3)await sleep(550*(t+1))}
  }
  throw last;
}
async function probe(url){
  try{
    const r=await fetch(url,{signal:AbortSignal.timeout(18000)});
    if(!r.ok)return {http:r.status};
    const bytes=Buffer.from(await r.arrayBuffer());
    return {http:r.status,bytes:bytes.length,hash:crypto.createHash('sha256').update(bytes).digest('hex')};
  }catch(e){return {error:String(e).slice(0,90)}}
}
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'CMS login missing');
 fs.mkdirSync('artifacts/brand-collision-inventory',{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const output=[];
 try{
  const page=await browser.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
    await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
    await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
    await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const token=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(token.status(),200);
  const headers={'X-WP-Nonce':(await token.text()).trim()};
  for(const id of ids){
    const p=await fetchJson(SRC+'/wp-json/wc/store/v1/products/'+id);
    const item={id,slug:p.slug,price:p.prices?.price,images:[],htmlGallery:[]};
    const imgHtml=await fetch(SRC+'/san-pham/'+p.slug+'/',{signal:AbortSignal.timeout(25000)});
    if(imgHtml.ok){
      const html=await imgHtml.text();
      item.htmlGallery=[...new Set([...html.matchAll(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi)]
       .filter(x=>x[1].toLowerCase().includes(String(p.name).replace(/&#[^;]+;/g,'').slice(0,6).toLowerCase()))
       .flatMap(x=>[...x[0].matchAll(/https?:\/\/aquathanhxuan\.com\/wp-content\/uploads\/[^"\s<>]+/g)].map(m=>m[0])))].slice(0,9);
    }
    for(const image of p.images||[]){
      if(!image.src)continue;
      const stem=decodeURIComponent(new URL(image.src).pathname.split('/').pop());
      const srcMeta=await fetchJson(SRC+'/wp-json/wp/v2/media/'+image.id);
      const candidates=[image.src];
      for(const [size,v] of Object.entries(srcMeta.media_details?.sizes||{})){
        const src=v?.source_url;
        if(src&&String(src).startsWith(SRC+'/wp-content/uploads/')&&!candidates.includes(src))candidates.push(src);
      }
      const srcset=String(image.srcset||'').split(',').map(x=>x.trim().split(/\s+/)[0]).filter(x=>x.startsWith(SRC+'/wp-content/uploads/'));
      for(const url of srcset)if(!candidates.includes(url))candidates.push(url);
      const unique=[];
      for(const url of candidates){
        const filename=decodeURIComponent(new URL(url).pathname.split('/').pop());
        const res=await page.request.get(WP+'/wp-json/wp/v2/media?context=edit&per_page=100&search='+encodeURIComponent(filename.replace(/\.[^.]+$/,'')),{headers,timeout:30000});
        assert.equal(res.status(),200,'Media search '+filename);
        const matches=(await res.json()).filter(v=>decodeURIComponent(new URL(v.source_url,WP).pathname.split('/').pop())===filename);
        const from=await probe(url);
        const tgt=[];
        for(const found of matches){
          const targetUrl=new URL(found.source_url,WP).href;
          tgt.push({id:found.id,...await probe(targetUrl)});
        }
        unique.push({url,filename,from:from.http===200?{bytes:from.bytes,hash:from.hash}:from,target:tgt});
      }
      item.images.push({sourceId:image.id,sourceOriginal:image.src,sourceAlt:image.alt,mediaVariants:unique});
    }
    const tr=await page.request.get(WP+'/wp-json/wc/v3/products?status=any&per_page=100&slug='+encodeURIComponent(p.slug),{headers,timeout:30000});
    assert.equal(tr.status(),200);
    item.targetProducts=(await tr.json()).map(z=>({id:z.id,slug:z.slug,images:(z.images||[]).map(y=>({id:y.id,src:y.src}))}));
    output.push(item);
    fs.writeFileSync('artifacts/brand-collision-inventory/variants.json',JSON.stringify({results:output},null,2)+'\n');
    const choices=item.images.flatMap(x=>x.mediaVariants.filter(y=>y.from?.hash&&(!y.target.length||y.target.some(z=>z.hash===y.from.hash))).map(z=>({filename:z.filename,src:z.url,hasSame:z.target.some(t=>t.hash===z.from.hash)})));
    console.log('BRAND_VARIANTS_SOURCE='+JSON.stringify({id,slug:p.slug,sourceImages:item.images.length,choices:choices.slice(0,15),targetProducts:item.targetProducts.length,htmlGallery:item.htmlGallery.slice(0,4)}).slice(0,4500));
    await sleep(150);
  }
  console.log('BRAND_VARIANTS_DONE='+output.length);
 }finally{await browser.close()}
})().catch(e=>{console.error('BRAND_VARIANTS_FAIL='+e.stack);process.exitCode=1});
