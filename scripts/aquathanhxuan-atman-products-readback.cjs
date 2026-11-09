'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='https://admin.aquathanhxuan.io.vn';
const expectedIds=new Set([82725,82727,82729,82731,82733,82734,82736,82738,82739]);
const sourceIds=new Set(['242514','5120','4867','3604','1405','1401','1397','1395','1394']);
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WP Admin login secrets');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 try{
  await page.goto(base+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const n=await page.request.get(base+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(n.status(),200);
  const nonce=(await n.text()).trim();assert(nonce);
  const response=await page.request.get(base+'/wp-json/wc/v3/products?status=publish&per_page=100&category=1793',{headers:{'X-WP-Nonce':nonce},timeout:45000});
  assert.equal(response.status(),200,'Products WooCommerce REST auth');
  const records=await response.json();
  assert.equal(records.length,9,'Atman category must have exactly 9 products');
  assert.deepEqual(new Set(records.map(x=>x.id)),expectedIds,'Atman created WordPress product IDs');
  const observedSource=new Set();
  let yoastTitles=0,missingSeoDescriptions=0;
  for(const product of records){
    assert.equal(product.type,'simple');
    assert(product.status==='publish'&&product.catalog_visibility==='visible');
    assert(product.categories.some(c=>Number(c.id)===1793),'Missing Atman category');
    assert(Number(product.price)>0&&Number(product.regular_price)>0,'Missing product price');
    const assetUrl=String(product.images?.[0]?.src||'');
    console.log('ATMAN_MEDIA_READBACK='+JSON.stringify({slug:product.slug,assetUrl}));
    assert(assetUrl&&assetUrl.includes('/wp-content/uploads/')&&!assetUrl.startsWith('https://aquathanhxuan.com/'),'Product media still hotlinked to source '+product.slug);
    const metadata=Object.fromEntries((product.meta_data||[]).map(x=>[x.key,x.value]));
    assert(metadata._esc_origin_product_id,'Origin product identifier absent');
    observedSource.add(String(metadata._esc_origin_product_id));
    assert(typeof metadata._yoast_wpseo_title==='string'&&metadata._yoast_wpseo_title.length>10,'Source SEO title not persisted '+product.slug);
    yoastTitles++;
    if(!metadata._yoast_wpseo_metadesc)missingSeoDescriptions++;
  }
  assert.deepEqual(observedSource,sourceIds,'Unexpected origin IDs');
  console.log('ATMAN_CMS_READ_AFTER_WRITE_PASS='+JSON.stringify({count:records.length,categoryId:1793,yoastTitles,missingSeoDescriptions,mediaOrigin:'WordPress',originalIds:[...observedSource]}));
 }finally{await browser.close()}
})().catch(e=>{console.error('ATMAN_CMS_READBACK_FAIL='+e.stack);process.exitCode=1});
