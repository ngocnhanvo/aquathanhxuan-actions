'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const WP='https://admin.aquathanhxuan.io.vn';
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage();
await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
if(await page.locator('#user_login').count()){
await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
await page.locator('#wp-submit').click();
}
await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
const nonceResp=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
assert.equal(nonceResp.status(),200);
const headers={'X-WP-Nonce':(await nonceResp.text()).trim()};
for(const slug of ['phan-nen-dennerle-scapers-soil-4lit','hanging-kits-bo-kit-treo-den-wrgb2-pro-chihiros','seachem-purigen']){
const raw=await page.request.get(WP+'/wp-json/wp/v2/product?context=edit&slug='+slug,{headers});
const woo=await page.request.get(WP+'/wp-json/wc/v3/products?slug='+slug,{headers});
assert.equal(raw.status(),200,'Raw WP '+slug);assert.equal(woo.status(),200,'Woo '+slug);
const a=(await raw.json())[0],b=(await woo.json())[0];
assert(a&&b,'Missing product '+slug);
assert.equal(a.regular_price,b.regular_price,'Raw WordPress regular_price does not match WooCommerce for '+slug);
assert.equal(a.stock_status,b.stock_status,'Raw WordPress stock_status does not match WooCommerce for '+slug);
console.log('AQUA_PRODUCT_REST_LIVE_PARITY_PASS='+JSON.stringify({
 slug,id:a.id,regularPrice:a.regular_price,stockStatus:a.stock_status
}));
const keys=Object.keys(a).filter(k=>/price|stock|status|currency|sale|regular|manage|product_type|type|acf|rest|meta/i.test(k));
const sample=Object.fromEntries(keys.map(k=>[k,a[k]]));
const limited={slug,id:a.id,rawKeys:keys,raw:sample,woo:{id:b.id,price:b.price,regular_price:b.regular_price,sale_price:b.sale_price,on_sale:b.on_sale,stock_status:b.stock_status,manage_stock:b.manage_stock,stock_quantity:b.stock_quantity,backorders:b.backorders,backorders_allowed:b.backorders_allowed,type:b.type,currency:b.currency}};
console.log('AQUA_PRODUCT_RAW_FIELDS='+JSON.stringify(limited).slice(0,7000));
}
}finally{await browser.close()}
})().catch(e=>{console.error('AQUA_PRODUCT_RAW_AUDIT_FAIL='+String(e.stack||e).slice(0,1300));process.exitCode=1});
