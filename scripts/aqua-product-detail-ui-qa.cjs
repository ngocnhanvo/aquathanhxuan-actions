'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const WP='https://admin.aquathanhxuan.io.vn';
const FRONT='https://aquathanhxuan.io.vn';
const SOURCE='https://aquathanhxuan.com';
const request=JSON.parse(fs.readFileSync('qa-requests/product-detail-ui.json','utf8'));
assert(/^[0-9a-f]{40}$/.test(request.astro_sha),'Missing exact Astro source commit');
const DIR='artifacts/product-detail-ui';
fs.mkdirSync(DIR,{recursive:true});
const report={sourceSha:request.astro_sha,startedAt:new Date().toISOString(),status:'STARTED',samples:[],screenshots:[],errors:[]};
const persist=()=>fs.writeFileSync(DIR+'/report.json',JSON.stringify(report,null,2)+'\n');
persist();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const compact=s=>String(s||'').replace(/\s+/g,' ').trim();
async function verifyDeployedSha(){
 const deadline=Date.now()+120000;
 let last='';
 do{
   try{
     const resp=await fetch(FRONT+'/aquathanhxuan-staging-build.json?t='+Date.now(),{signal:AbortSignal.timeout(9000),headers:{'Cache-Control':'no-cache'}});
     if(resp.ok){
       const json=await resp.json();
       last=String(json.commit||'');
       if(last===request.astro_sha)return;
     }else last='HTTP '+resp.status;
   }catch(e){last=String(e)}
   if(Date.now()+10000>=deadline)break;
   await pause(10000);
 }while(Date.now()<deadline);
 throw Error('DEPLOY_READY_TIMEOUT expected='+request.astro_sha+' actual='+last);
}
async function run(){
 await verifyDeployedSha();
 console.log('DETAIL_DEPLOY_READY='+request.astro_sha);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const admin=await browser.newPage();
  await admin.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await admin.locator('#user_login').count()){
   await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await admin.locator('#wp-submit').click();
  }
  await admin.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nonceResp=await admin.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceResp.status(),200);
  const headers={'X-WP-Nonce':(await nonceResp.text()).trim()};
  async function getWC(slug){
   const resp=await admin.request.get(WP+'/wp-json/wc/v3/products?slug='+encodeURIComponent(slug),{headers,timeout:30000});
   assert.equal(resp.status(),200,'Product WC lookup HTTP '+slug);
   const rows=await resp.json();
   assert.equal(rows.length,1,'Product unique slug '+slug);
   return rows[0];
  }
  async function getRaw(id){
   const resp=await admin.request.get(WP+'/wp-json/wp/v2/product/'+id,{headers,timeout:30000});
   assert.equal(resp.status(),200,'Product raw REST '+id);
   return resp.json();
  }
  const slugs=[
   'phan-nen-dennerle-scapers-soil-4lit',
   'hanging-kits-bo-kit-treo-den-wrgb2-pro-chihiros',
   'may-sui-khi-atman-hp-12000',
   'seachem-purigen'
  ];
  for(const slug of slugs){
   const wc=await getWC(slug);
   const raw=await getRaw(wc.id);
   assert.equal(String(raw.regular_price),String(wc.regular_price),'Woo regular price flow '+slug);
   assert.equal(raw.stock_status,wc.stock_status,'Woo stock REST flow '+slug);
   const current=Number(wc.price);
   const regular=Number(wc.regular_price);
   const sale=Number.isFinite(current)&&regular>current;
   const percent=sale?Math.round((regular-current)/regular*100):null;
   const row={slug,sourceId:wc.id,current,regular,stock:wc.stock_status,sale,percent,screenshots:[]};
   for(const width of [1440,390]){
    const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844}});
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(FRONT+'/san-pham/'+slug,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(response?.status(),200,'Product detail HTTP '+slug+' '+width);
    assert.equal(await page.locator('h1').count(),1,'Product H1 '+slug);
    assert(await page.locator('#data-content-wrapper').count(),'Missing detail markup '+slug);
    const status=await page.locator('[data-product-stock-status]').getAttribute('data-product-stock-status');
    assert.equal(status,wc.stock_status,'Stock UI must reflect live WooCommerce '+slug+' '+width);
    const stockText=compact(await page.locator('[data-product-stock-status]').innerText());
    const label={instock:'Còn hàng',outofstock:'Hết hàng',onbackorder:'Cho phép đặt trước'}[wc.stock_status];
    assert(stockText.includes(label),'Incorrect stock label '+slug+' '+width);
    const shortCount=await page.locator('.product-short-description').count();
    assert.equal(shortCount,compact(wc.short_description)?1:0,'Woo excerpt displayed exactly when present '+slug);
    if(shortCount){
     const sourceText=await page.evaluate(html=>{const el=document.createElement('div');el.innerHTML=html;return el.textContent?.replace(/\s+/g,' ').trim()},wc.short_description);
     const targetText=compact(await page.locator('.product-short-description').textContent());
     assert.equal(targetText,sourceText,'Short description text parity '+slug+' '+width);
    }
    const oldCount=await page.locator('[data-product-regular-price]').count();
    const discountCount=await page.locator('[data-product-discount-percent]').count();
    assert.equal(oldCount,sale?1:0,'Do not invent old price '+slug);
    assert.equal(discountCount,sale?1:0,'Sale badge presence '+slug);
    if(sale){
     assert.equal(await page.locator('[data-product-regular-price]').getAttribute('data-product-regular-price'),String(regular));
     assert.equal(await page.locator('[data-product-discount-percent]').getAttribute('data-product-discount-percent'),String(percent));
    }
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert(overflow<=2,'Horizontal scroll '+slug+' '+width+' width='+overflow);
    const screenshot=`${slug}-${width}.png`;
    await page.screenshot({path:DIR+'/'+screenshot,fullPage:true});
    report.screenshots.push(screenshot);
    if(width===1440){
      // Independent source visual reference for information hierarchy.
      const source=await ctx.newPage();
      const original=await source.goto(SOURCE+'/san-pham/'+slug+'/',{waitUntil:'domcontentloaded',timeout:60000});
      assert.equal(original?.status(),200,'Source Product comparison '+slug);
      const name='source-'+slug+'-'+width+'.png';
      await source.screenshot({path:DIR+'/'+name,fullPage:true});
      report.screenshots.push(name);
      await source.close();
    }
    assert.deepEqual(errors,[],'Browser errors '+slug);
    await ctx.close();
    row.screenshots.push(screenshot);
    console.log('DETAIL_FRONTEND_PASS='+JSON.stringify({slug,width,stock:wc.stock_status,hasSale:sale,discountPercent:percent,short:shortCount>0}));
   }
   report.samples.push(row);persist();
  }
  report.status='QA_PASS';
  report.completedAt=new Date().toISOString();persist();
  console.log('DETAIL_PRODUCT_UI_QA_PASS='+JSON.stringify({count:report.samples.length,viewports:[1440,390],screenshots:report.screenshots.length,sha:request.astro_sha}));
 }finally{await browser.close()}
}
run().catch(err=>{report.status='QA_FAILED';report.errors.push(String(err.stack||err).slice(0,1200));persist();console.error('DETAIL_PRODUCT_UI_QA_FAILED='+String(err.stack||err).slice(0,1200));process.exitCode=1});
