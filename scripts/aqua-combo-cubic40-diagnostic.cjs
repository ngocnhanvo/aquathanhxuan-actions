'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const PUBLIC='https://aquathanhxuan.io.vn';
const ORIGINAL='https://aquathanhxuan.com';
const SLUG='combo-be-cubic-40-sieu-trong';
const DIR='artifacts/aqua-combo-cubic40';
fs.mkdirSync(DIR,{recursive:true});
const output={slug:SLUG,time:new Date().toISOString(),mode:'READ_ONLY',status:'STARTED',public:[],cms:{},original:{},errors:[]};
const save=()=>fs.writeFileSync(DIR+'/diagnostic.json',JSON.stringify(output,null,2)+'\n');
const errorString=e=>String(e?.message||e).slice(0,750);
async function requestInfo(page,url){
 try{
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(900);
  const dom=await page.evaluate(()=>({
   title:document.title,
   h1:Array.from(document.querySelectorAll('h1')).map(x=>x.innerText.trim().slice(0,180)),
   description:(document.querySelector('meta[name="description"]')?.content||'').slice(0,250),
   bodyText:(document.body.innerText||'').slice(0,450),
   id:document.querySelector('[data-product-id]')?.getAttribute('data-product-id')||null,
   detail:!!document.querySelector('#data-content-wrapper'),
   productName:document.querySelector('[data-product-name]')?.getAttribute('data-product-name')||null,
   stock:document.querySelector('[data-product-stock-status]')?.getAttribute('data-product-stock-status')||null,
   sticky:!!document.querySelector('#product-sticky-purchase'),
   imageCount:document.querySelectorAll('main img').length,
   htmlLength:document.documentElement.outerHTML.length,
  }));
  return {status:response?.status(),url:page.url(),...dom};
 }catch(e){return {error:errorString(e),url};}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
   const page=await context.newPage();
   const exceptions=[],failedRequests=[],httpErrors=[];
   page.on('pageerror',e=>exceptions.push(errorString(e)));
   page.on('requestfailed',req=>failedRequests.push({url:req.url().slice(0,180),failure:req.failure()}));
   page.on('response',res=>{if(res.status()>=400&&httpErrors.length<18)httpErrors.push({status:res.status(),url:res.url().slice(0,180)})});
   const info=await requestInfo(page,PUBLIC+'/san-pham/'+SLUG);
   const ssr=await requestInfo(page,PUBLIC+'/ssr/products/'+SLUG+'/detail?curUrl='+encodeURIComponent('/san-pham/'+SLUG));
   output.public.push({width,...info,directSsr:ssr,exceptions:exceptions.slice(0,12),failedRequests:failedRequests.slice(0,12),httpErrors:httpErrors.slice(0,18)});
   await page.screenshot({path:DIR+'/public-'+width+'.png',fullPage:true,timeout:50000}).catch(()=>{});
   console.log('CUBIC40_PUBLIC='+JSON.stringify(output.public.at(-1)).slice(0,2800));
   await context.close();save();
  }
  const originPage=await browser.newPage({viewport:{width:1440,height:900}});
  output.original.page=await requestInfo(originPage,ORIGINAL+'/san-pham/'+SLUG+'/');
  await originPage.screenshot({path:DIR+'/original.png',fullPage:false,timeout:40000}).catch(()=>{});
  const api=await originPage.request.get(ORIGINAL+'/wp-json/wc/store/v1/products?search='+encodeURIComponent('Cubic 40'),{timeout:40000});
  output.original.storeSearchStatus=api.status();
  if(api.ok())output.original.storeSearch=(await api.json()).slice(0,10).map(p=>({id:p.id,slug:p.slug,name:p.name,type:p.type,prices:p.prices,has_options:p.has_options}));
  await originPage.close();
  console.log('CUBIC40_SOURCE='+JSON.stringify(output.original).slice(0,5000));
  assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WP secrets missing');
  const admin=await browser.newPage();
  await admin.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await admin.locator('#user_login').count()){
   await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await admin.locator('#wp-submit').click();
  }
  await admin.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nonce=await admin.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:30000});
  assert.equal(nonce.status(),200,'REST nonce read');
  const headers={'X-WP-Nonce':(await nonce.text()).trim()};
  for(const [key,url] of Object.entries({
   bySlug:WP+'/wp-json/wc/v3/products?slug='+SLUG+'&status=any',
   bySearch:WP+'/wp-json/wc/v3/products?search='+encodeURIComponent('Cubic 40')+'&status=any&per_page=30',
   wpRest:WP+'/wp-json/wp/v2/product?slug='+SLUG+'&context=edit',
  })){
   try{
    const response=await admin.request.get(url,{headers,timeout:40000});
    const data=response.ok()?await response.json():null;
    output.cms[key]={http:response.status(),rows:Array.isArray(data)?data.slice(0,20).map(p=>({
     id:p.id,slug:p.slug,name:p.name||p.title?.rendered,status:p.status,type:p.type,permalink:p.permalink,
     price:p.price,stock_status:p.stock_status,images:p.images?.length,
     categories:p.categories?.map(c=>({id:c.id,slug:c.slug})),originId:p.acf?.origin_product_id,
     variationCount:p.variations?.length,metadata:(p.meta_data||[]).filter(m=>/origin|source/.test(m.key)).slice(0,6)
    })):[],error:!response.ok()?(await response.text()).slice(0,350):null};
   }catch(e){output.cms[key]={error:errorString(e)};}
  }

  const rules=[];
  for(let n=1;n<=20;n++){
   const response=await admin.request.get(WP+'/wp-json/wp/v2/chuyen-huong-link?context=edit&status=any&per_page=100&page='+n,{headers,timeout:40000});
   if(response.status()===400)break;
   assert.equal(response.status(),200,'Native Rewrite pagination HTTP');
   const rows=await response.json();
   for(const row of rows){
    const a=row.acf||{};
    const from=String(a.from_link||'');
    let match=false;
    try{match=new RegExp(from).test('/san-pham/'+SLUG)}catch{}
    if(match)rules.push({id:row.id,status:row.status,title:row.title?.rendered,from,to:a.to_link,
      type:a.type,matchType:a.match_type,enable:a.enable});
   }
   if(rows.length<100)break;
  }
  output.cms.rewriteMatches=rules;
  await admin.close();
  output.status='DIAGNOSTIC_COMPLETE';save();
  console.log('CUBIC40_CMS='+JSON.stringify(output.cms).slice(0,5000));
  console.log('CUBIC40_DIAGNOSTIC_DONE='+JSON.stringify({public:output.public.map(x=>({width:x.width,http:x.status,detail:x.detail,url:x.url,h1:x.h1,exceptions:x.exceptions})),wp:output.cms.bySlug?.rows?.length,source:output.original.storeSearch?.map(x=>x.slug)}));
 }finally{await browser.close();}
})().catch(e=>{output.status='DIAGNOSTIC_FAILED';output.errors.push(String(e.stack||e).slice(0,1800));save();console.error('CUBIC40_DIAGNOSTIC_FAILED='+output.errors.at(-1));process.exitCode=1;});
