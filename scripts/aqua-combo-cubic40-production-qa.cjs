'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const BASE='https://aquathanhxuan.io.vn',ORIGINAL='https://aquathanhxuan.com';
const SLUG='combo-be-cubic-40-sieu-trong';
const ID='82477';
const SHA=JSON.parse(fs.readFileSync('qa-requests/combo-cubic40-production.json','utf8')).source_sha;
assert(/^[a-f0-9]{40}$/.test(SHA),'Missing source_sha for QA');
const OUT='artifacts/aqua-combo-cubic40-production';
fs.mkdirSync(OUT,{recursive:true});
const result={slug:SLUG,sourceSha:SHA,environment:'production',status:'STARTED',checks:[],errors:[]};
const save=()=>fs.writeFileSync(OUT+'/report.json',JSON.stringify(result,null,2)+'\n');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let marker='';
 for(let attempt=0;attempt<12;attempt++){
  try{
   const r=await fetch(BASE+'/aquathanhxuan-staging-build.json?t='+Date.now(),{
    signal:AbortSignal.timeout(9000),headers:{'Cache-Control':'no-cache'}
   });
   if(r.ok)marker=String((await r.json()).commit||'');
   if(marker===SHA)break;
  }catch(e){marker=String(e).slice(0,100)}
  if(attempt<11)await sleep(10000);
 }
 assert.equal(marker,SHA,'DEPLOY_READY marker does not match exact requested Astro production SHA');
 console.log('CUBIC40_DEPLOY_READY='+SHA);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const original=await browser.newPage();
  const originalResponse=await original.goto(ORIGINAL+'/san-pham/'+SLUG+'/',{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(originalResponse?.status(),200,'Original product HTTP');
  const originalName=(await original.locator('h1').allTextContents()).map(s=>s.trim()).find(Boolean);
  assert.equal(originalName,'Combo bể cubic 40 siêu trong','Original product identity changed');
  await original.close();
  for(const [width,height] of [[1440,900],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height}});
   try{
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(BASE+'/san-pham/'+SLUG,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(response?.status(),200,'Product public URL '+width);
    assert.equal(page.url(),BASE+'/san-pham/'+SLUG,'Unexpected public redirect '+width);
    const body=page.locator('#data-content-wrapper');
    assert.equal(await body.count(),1,'Product detail content missing '+width);
    assert.equal(await body.getAttribute('data-product-id'),ID,'Target Product ID '+width);
    assert.equal(await page.locator('h1').first().textContent().then(s=>s.trim()),originalName,'Product title '+width);
    assert.equal(await page.locator('[data-product-stock-status]').getAttribute('data-product-stock-status'),'instock','Stock status '+width);
    const text=(await page.locator('main').innerText()).replace(/\s+/g,' ');
    assert(text.includes('2.700.000'),'Live price missing '+width);
    assert(text.includes('3.170.000'),'Regular price missing '+width);
    assert(text.includes('Còn hàng'),'Stock label missing '+width);
    assert.equal(await page.locator('#product-purchase-actions').count(),1,'Purchase actions '+width);
    assert.equal(await page.locator('#product-sticky-purchase').count(),1,'Sticky CTA '+width);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert(overflow<=3,'Unexpected horizontal overflow '+width+': '+overflow);
    assert.deepEqual(errors,[],'Browser errors at '+width);
    const file='combo-cubic40-'+width+'.png';
    await page.screenshot({path:OUT+'/'+file,fullPage:true,timeout:45000});
    const check={width,http:response.status(),title:originalName,id:ID,price:2700000,regularPrice:3170000,stock:'instock',overflow,errors:0,passed:true,screenshot:file};
    result.checks.push(check);save();
    console.log('CUBIC40_PRODUCT_UI_PASS='+JSON.stringify(check));
   }finally{await ctx.close()}
  }
  // Regression: an existing source-backed product route must remain intact.
  const other=await browser.newPage();
  const preserved=await other.goto(BASE+'/san-pham/phan-nen-dennerle-scapers-soil-4lit',{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(preserved?.status(),200,'Existing published Product route regression');
  assert.equal(await other.locator('#data-content-wrapper').count(),1,'Existing Product detail missing');
  await other.close();
  result.status='PASS';save();
  console.log('CUBIC40_PRODUCTION_QA_PASS='+JSON.stringify({slug:SLUG,sourceSha:SHA,checks:result.checks.length,regression:1}));
 }finally{await browser.close()}
}
main().catch(e=>{result.status='FAIL';result.errors.push(String(e.stack||e).slice(0,2000));save();console.error('CUBIC40_PRODUCTION_QA_FAIL='+result.errors.at(-1));process.exitCode=1});
