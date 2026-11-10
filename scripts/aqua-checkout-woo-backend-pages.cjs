'use strict';
/**
 * Bind WooCommerce's native backend cart/checkout settings to the three
 * already-published Aqua ACF SSR Page records. Woo OnePay's get_return_url()
 * requires a working backend WC checkout Page containing the real WC shortcode
 * to trigger the signature-verifying thankyou hook.
 *
 * This deliberately never creates products, customers, coupons or orders.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const WP='https://admin.aquathanhxuan.io.vn';
const OUT='artifacts/aqua-woo-checkout-pages';
fs.mkdirSync(OUT,{recursive:true});
const specs=[
 {id:83808,slug:'cart',key:'ssr-cart',action:'CartPage',shortcode:'[woocommerce_cart]',setting:'woocommerce_cart_page_id',expectedPrevious:'46562'},
 {id:83810,slug:'checkout',key:'ssr-checkout',action:'CheckoutPage',shortcode:'[woocommerce_checkout]',setting:'woocommerce_checkout_page_id',expectedPrevious:'46601'},
];
const report={scope:'ONLY WooCommerce native cart/checkout Page settings and content of WP Pages 83808/83810',
 status:'STARTED',pages:[],settings:[],writes:[],created_orders:0,created_customers:0};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(report,null,2)+'\n');
const getContent=(page)=>String(page?.content?.raw??'').trim();
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WP Admin credentials');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:55000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nonceRes=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert(nonceRes.ok(),'Cannot read WordPress REST nonce');
  const headers={'X-WP-Nonce':(await nonceRes.text()).trim(),'Content-Type':'application/json'};
  async function request(method,path,body){
   const result=await page.request.fetch(WP+path,{method,headers,
     ...(body?{data:body}:{}),timeout:30000});
   const raw=await result.text();
   assert(result.ok(),method+' '+path+' HTTP '+result.status()+' '+raw.slice(0,240));
   return JSON.parse(raw);
  }
  // Verify the entire write scope BEFORE changing any records.
  const plans=[];
  for(const spec of specs){
   const record=await request('GET','/wp-json/wp/v2/pages/'+spec.id+'?context=edit');
   assert.equal(record.status,'publish','Required Page must be published');
   assert.equal(record.slug,spec.slug,'Unexpected WordPress Page slug');
   assert.equal(record.acf?.key,spec.key,'Unexpected WordPress ACF Page key');
   assert.equal(record.acf?.action,spec.action,'Unexpected WordPress component Action');
   const existingContent=getContent(record);
   assert(!existingContent || existingContent===spec.shortcode,
     'Refusing to overwrite nonempty WordPress Page content '+spec.id);
   const current=await request('GET','/wp-json/wc/v3/settings/advanced/'+spec.setting);
   const value=String(current.value??'');
   assert(value===spec.expectedPrevious||value===String(spec.id),
     'WooCommerce '+spec.setting+' changed: refusing to override a different Page');
   plans.push({spec,contentWas:existingContent,settingWas:value});
   report.pages.push({id:spec.id,slug:spec.slug,key:spec.key,
      contains_native_shortcode:existingContent===spec.shortcode});
   report.settings.push({id:spec.setting,from:value,to:String(spec.id)});
  }
  save();
  for(const plan of plans){
   const {spec,contentWas,settingWas}=plan;
   if(contentWas!==spec.shortcode){
    await request('POST','/wp-json/wp/v2/pages/'+spec.id,{content:spec.shortcode});
    report.writes.push({kind:'Page shortcode',id:spec.id});
    save();
   }
   if(settingWas!==String(spec.id)){
    await request('PUT','/wp-json/wc/v3/settings/advanced/'+spec.setting,{value:String(spec.id)});
    report.writes.push({kind:'WooCommerce Page setting',id:spec.setting});
    save();
   }
   const after=await request('GET','/wp-json/wp/v2/pages/'+spec.id+'?context=edit');
   assert.equal(getContent(after),spec.shortcode,'Native Woo shortcode was not saved');
   assert.equal(after.acf?.key,spec.key,'Page ACF changed unexpectedly');
   const setting=await request('GET','/wp-json/wc/v3/settings/advanced/'+spec.setting);
   assert.equal(String(setting.value),String(spec.id),'WooCommerce setting did not persist');
  }
  const checkoutUrl=WP+'/checkout/';
  const checkoutResponse=await page.request.get(checkoutUrl,{timeout:25000});
  report.backendCheckoutRoute={status:checkoutResponse.status(),path:'/checkout/'};
  assert.equal(checkoutResponse.status(),200,'Backend Woo checkout Page is not publicly accessible');
  report.status='PASS';save();
  console.log('AQUA_WOO_BACKEND_CHECKOUT_PAGES_PASS='+JSON.stringify({
   pages:report.pages,settings:report.settings,writes:report.writes,
   backendCheckoutRoute:report.backendCheckoutRoute,created_orders:0
  }));
 }finally{await browser.close()}
})().catch(err=>{report.status='FAIL';report.error=String(err?.message||err).slice(0,500);save();console.error('AQUA_WOO_BACKEND_CHECKOUT_PAGES_FAIL='+report.error);process.exitCode=1;});
