'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const URL='https://admin.aquathanhxuan.io.vn';
const FRONT='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-checkout-audit';
fs.mkdirSync(OUT,{recursive:true});
const report={scope:'READ_ONLY',at:new Date().toISOString(),gateway:[],coupons:[],routes:[],checks:[]};
const save=()=>fs.writeFileSync(OUT+'/audit.json',JSON.stringify(report,null,2)+'\n');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage();
  for(const path of ['/cart','/cart/','/checkout','/checkout/','/order-received','/gio-hang','/gio-hang/','/thanh-toan','/thanh-toan/','/ssr/cart/cart','/ssr/cart/checkout','/ssr/cart/order-received']){
   const r=await page.goto(FRONT+path,{waitUntil:'domcontentloaded',timeout:35000}).catch(e=>null);
   report.routes.push({path,status:r?.status()||0,url:page.url(),h1:await page.locator('h1').first().textContent().catch(()=>null)});
  }
  // Diagnose whether the compiled SSR route pages are present in runtime's
  // published WordPress Page cache. This is read-only and contains no cart data.
  report.ssrPageCache={};
  const baseline=await page.request.get(FRONT+'/data/cms-common.json',{timeout:25000,headers:{'Cache-Control':'no-cache'}});
  report.ssrPageCache.commonHttp=baseline.status();
  if(baseline.ok()){
   const json=await baseline.json().catch(()=>null);
   const rows=Array.isArray(json?.pages)?json.pages:[];
   report.ssrPageCache.keys=rows.filter(x=>['ssr-cart','ssr-checkout','ssr-checkoutdone'].includes(x.key))
    .map(x=>({id:x.id,key:x.key,slug:x.slug,action:x.action}));
  }
  report.ssrPageCache.files=[];
  for(const slug of ['cart','checkout','order-received']){
   const resp=await page.request.get(FRONT+'/data/page-'+slug+'.json',{timeout:25000,headers:{'Cache-Control':'no-cache'}});
   const row={slug,http:resp.status(),key:null,action:null};
   if(resp.ok()){const json=await resp.json().catch(()=>null);row.key=json?.key||null;row.action=json?.action||null;}
   report.ssrPageCache.files.push(row);
  }
  save();
  await page.goto(URL+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:40000});
  if(await page.locator('#user_login').count()){
   assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WP secrets missing');
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:40000});
  const nonce=(await (await page.request.get(URL+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:15000})).text()).trim();
  const headers={'X-WP-Nonce':nonce};
  async function get(key,path){
   const r=await page.request.get(URL+path,{headers,timeout:30000});
   const data=r.ok()?await r.json():[];
   report.checks.push({key,status:r.status(),isArray:Array.isArray(data)});
   return Array.isArray(data)?data:[];
  }
  const [gateways,coupons,pages,settings,rewrites,advanced]=await Promise.all([
   get('gateways','/wp-json/wc/v3/payment_gateways'),
   get('coupons','/wp-json/wc/v3/coupons?per_page=100'),
   get('pages','/wp-json/wp/v2/pages?per_page=100&status=publish&context=edit'),
   get('settings','/wp-json/wc/v3/settings/general'),
   get('rewrite','/wp-json/wp/v2/chuyen-huong-link?context=edit&status=publish&per_page=100'),
   get('advanced','/wp-json/wc/v3/settings/advanced')
  ]);
  report.checkoutRewrites=rewrites.filter(x=>/cart|checkout|order-received/i.test(String(x.acf?.from_link||''))).map(x=>({id:x.id,from:x.acf?.from_link,to:x.acf?.to_link,type:x.acf?.type,match_type:x.acf?.match_type,enable:x.acf?.enable}));
  report.woocommerceCouponSetting=settings.find(x=>x.id==='woocommerce_enable_coupons')?.value??'NOT_RETURNED';
  // OnePay uses WooCommerce get_return_url($order) and processes signed
  // gateway responses on the backend Woo thankyou hook. Never log merchant
  // credentials, even with a WordPress admin session.
  const onepayResponse=await page.request.get(URL+'/wp-json/wc/v3/payment_gateways/onepayus',{headers,timeout:30000});
  const onepay=onepayResponse.ok()?await onepayResponse.json():null;
  const paySettings=onepay?.settings||{};
  const configured=(key)=>{
   const value=paySettings?.[key]?.value;
   return typeof value==='string' && value.trim().length>0;
  };
  let paymentOrigin=null;
  try {
   const urlValue=paySettings?.onepay_url?.value;
   if(typeof urlValue==='string' && urlValue.trim()) {
    const uri=new URL(urlValue);
    paymentOrigin={protocol:uri.protocol,hostname:uri.hostname};
   }
  } catch {}
  report.onepayReadiness={
   http:onepayResponse.status(),enabled:onepay?.enabled??null,
   merchant_id_configured:configured('merchant_id'),
   access_code_configured:configured('merchant_access_code'),
   secure_secret_configured:configured('secure_secret'),
   payment_url_configured:configured('onepay_url'),
   payment_url_value_type:typeof paySettings?.onepay_url?.value,
   payment_url_trim_parses:(()=>{
    const value=paySettings?.onepay_url?.value;
    if(typeof value!=='string')return false;
    try{return new URL(value.trim()).protocol==='https:';}catch{return false;}
   })(),
   payment_url_internal_whitespace:typeof paySettings?.onepay_url?.value==='string' &&
    paySettings.onepay_url.value.trim().includes(' '),
   payment_url_has_https_prefix:typeof paySettings?.onepay_url?.value==='string' &&
    paySettings.onepay_url.value.trim().toLowerCase().startsWith('https://'),
   payment_origin:paymentOrigin
  };
  report.checkoutWooSettings=advanced.filter(x=>[
   'woocommerce_checkout_page_id','woocommerce_cart_page_id',
   'woocommerce_myaccount_page_id','woocommerce_checkout_order_received_endpoint'
  ].includes(String(x.id))).map(x=>({id:x.id,value:x.value}));
  // WooCommerce get_return_url() targets the configured *backend* checkout Page,
  // which may intentionally differ from Astro's published SSR Page. The Woo
  // callback must be able to execute native thankyou hooks on that backend Page.
  report.backendWooPages=[];
  for(const id of [...new Set(report.checkoutWooSettings
    .filter(x=>['woocommerce_checkout_page_id','woocommerce_cart_page_id'].includes(x.id))
    .map(x=>Number(x.value)).filter(Number.isSafeInteger).filter(x=>x>0))]){
   const pRes=await page.request.get(URL+'/wp-json/wp/v2/pages/'+id+'?context=edit',{headers,timeout:30000});
   const pageData=pRes.ok()?await pRes.json():null;
   const content=String(pageData?.content?.raw||pageData?.content?.rendered||'');
   report.backendWooPages.push({
    id,http:pRes.status(),status:pageData?.status||null,
    slug:pageData?.slug||null,
    has_woocommerce_checkout_shortcode:content.includes('[woocommerce_checkout]'),
    has_woocommerce_checkout_block:content.includes('wp:woocommerce/checkout'),
    has_woocommerce_cart_shortcode:content.includes('[woocommerce_cart]'),
    has_woocommerce_cart_block:content.includes('wp:woocommerce/cart')
   });
  }


  // Inventory configured native WooCommerce shipping, never assume a flat
  // shipping fee or copy ESC.vn's logistics policies into Aqua.
  const shippingZones=await get('shipping-zones','/wp-json/wc/v3/shipping/zones?per_page=100');
  report.shippingZones=[];
  const uniqueZones=[{id:0,name:'Locations not covered by other zones'},...shippingZones];
  for(const zone of uniqueZones.slice(0,20)){
   const methods=await get('shipping-methods-'+zone.id,'/wp-json/wc/v3/shipping/zones/'+zone.id+'/methods?per_page=100');
   report.shippingZones.push({
    id:zone.id,name:zone.name,
    methods:methods.map(m=>({id:m.id,method_id:m.method_id,title:m.title,enabled:m.enabled,
      cost_configured:typeof m.settings?.cost?.value==='string' && m.settings.cost.value.length>0}))
   });
  }
  report.shippingSettings=settings.filter(x=>/shipping|ship_to/.test(String(x.id||'')))
    .map(x=>({id:x.id,value:x.value}));

  report.gateway=gateways.map(x=>({id:x.id,title:x.title,enabled:x.enabled,method_title:x.method_title}));
  // Only public-facing BACS bank names/count, never log account numbers.
  const bacsResponse=await page.request.get(URL+'/wp-json/wc/v3/payment_gateways/bacs',{headers,timeout:30000});
  const bacs=bacsResponse.ok()?await bacsResponse.json():null;
  const bankAccounts=Array.isArray(bacs?.settings?.accounts?.value)?bacs.settings.accounts.value:[];
  report.bacsAccountSettings={
   http:bacsResponse.status(),enabled:bacs?.enabled??null,
   count:bankAccounts.length,
   bankNames:bankAccounts.map(x=>String(x.bank_name||'').slice(0,100))
  };

  report.coupons=coupons.filter(x=>x.status==='publish').map(x=>({id:x.id,code:x.code,discount_type:x.discount_type,amount:x.amount,minimum_amount:x.minimum_amount,individual_use:x.individual_use}));
  report.pageCandidates=pages.filter(x=>/ssr-cart|ssr-checkout|cart|checkout|thanh-toan|gio-hang/i.test(JSON.stringify(x.acf||{})+' '+x.slug+' '+x.title?.rendered)).map(x=>({id:x.id,slug:x.slug,acf:{key:x.acf?.key,action:x.acf?.action},title:x.title?.rendered}));
  report.status='PASS';save();
  console.log('AQUA_CHECKOUT_AUDIT_SUMMARY='+JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{report.status='FAIL';report.error=String(e.message||e).slice(0,500);save();console.error(report.error);process.exitCode=1;});
