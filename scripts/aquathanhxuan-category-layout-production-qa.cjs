'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const origin='https://aquathanhxuan.io.vn';
const expectedSha=process.env.EXPECTED_ASTRO_SHA || JSON.parse(fs.readFileSync('qa-requests/category-layout-production.json','utf8')).source_sha;
const titles=new Set([
 'Máy sủi Oxy công suất lớn HP 12000 Atman','Máy sủi oxy công suất lớn Atman HP-4000',
 'Máy sủi oxy công suất lớn Atman HP-8000','Máy sưởi Atman CH 300W',
 'Máy bơm Atman AT-106S','Máy bơm Atman AT-107S',
 'Máy bơm Atman AT-306S','Máy bơm Atman AT-305S','Máy bơm Atman AT-304S'
]);
const time=()=>Date.now();
(async()=>{
 assert(/^[0-9a-f]{40}$/.test(expectedSha||''),'Expected exact Astro SHA');
 const r=await fetch(origin+'/aquathanhxuan-staging-build.json?t='+time(),{headers:{'Cache-Control':'no-cache'}});
 assert.equal(r.status,200,'Production marker');
 const marker=await r.json();
 assert.equal(marker.commit,expectedSha,'Deployed Astro commit mismatch');
 fs.mkdirSync('artifacts/category-layout-production',{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport});
   const page=await context.newPage(); const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const go=async path=>{
     const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:60000});
     assert.equal(response.status(),200,'HTTP 200 '+path);
   };
   await go('/san-pham/atman?check='+time());
   const table=page.locator('[data-tablepress-preview="catalog_banner"] [data-esc-source-table="catalog_banner"]');
   assert.equal(await table.count(),1,'WordPress ESC Table banner chain');
   assert.equal(await table.locator('[data-catalog-slide]').count(),2,'Two source banners');
   const geometry=await table.locator('.catalog-banner__viewport').evaluate(e=>{
      const r=e.getBoundingClientRect();return {w:r.width,h:r.height,y:r.y};
   });
   assert(Math.abs(geometry.w/geometry.h-4)<0.1,'Source banner aspect 4:1 '+JSON.stringify(geometry));
   const before=await table.locator('[data-catalog-slide][data-active="true"] img').getAttribute('src');
   await table.locator('[data-catalog-next]').click();
   const after=await table.locator('[data-catalog-slide][data-active="true"] img').getAttribute('src');
   assert(before&&after&&before!==after,'Banner carousel next action');
   const cards=page.locator('[data-catalog-product]');
   assert.equal(await cards.count(),9,'Exact real Atman product count');
   const labels=await cards.locator('h2').allInnerTexts();
   assert.deepEqual(new Set(labels.map(x=>x.trim())),titles,'Legacy Product identity parity');
   assert.equal(await page.locator('#catalog-sort option').count(),4,'Sort options');
   assert.equal(await page.locator('#recently-viewed-title').count(),1,'Recent history section');
   const dimensions=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert(dimensions.page<=dimensions.viewport+2,'Horizontal overflow '+viewport.width+' '+JSON.stringify(dimensions));
   await page.screenshot({path:'artifacts/category-layout-production/atman-'+viewport.width+'.png',fullPage:true});
   const productUrl=await cards.first().locator('a[href]').first().getAttribute('href');
   assert(productUrl&&productUrl.startsWith('/san-pham/'),'Product route unexpectedly changed');
   await go(productUrl);
   assert.equal(await page.locator('[data-recent-product]').count(),1,'Product view tracking not mounted');
   await page.waitForFunction(()=>Object.keys(localStorage).some(k=>k.includes('recent-products')),{timeout:10000});
   await go('/san-pham/atman?visit='+time());
   await page.locator('#recently-viewed-list a').first().waitFor({state:'attached',timeout:10000});
   assert((await page.locator('#recently-viewed-list a').count())>=1,'Recent history card missing');
   for(const order of ['price-asc','price-desc']){
     await go('/san-pham/atman?sort='+order+'&t='+time());
     const values=await page.locator('[data-catalog-product-price]').evaluateAll(nodes=>nodes.map(x=>Number(x.getAttribute('data-catalog-product-price'))));
     assert.equal(values.length,9,'Sort product count '+order);
     const sorted=[...values].sort((a,b)=>order==='price-asc'?a-b:b-a);
     assert.deepEqual(values,sorted,'Price ordering '+order);
   }
   assert.equal(errors.length,0,'JS page errors '+JSON.stringify(errors));
   console.log('ATMAN_PRODUCTION_QA_PASS='+JSON.stringify({width:viewport.width,products:9,banners:2,sort:['price-asc','price-desc'],recentViewed:true,geometry,errors:0}));
   await context.close();
  }
  console.log('ATMAN_PRODUCTION_ALL_PASS=2 viewport * 2 sorting + real product history; exact SHA '+expectedSha);
 }finally{await browser.close()}
})().catch(e=>{console.error('ATMAN_PRODUCTION_QA_FAIL='+e.stack);process.exitCode=1});
