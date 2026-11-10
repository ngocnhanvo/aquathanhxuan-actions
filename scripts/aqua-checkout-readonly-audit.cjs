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
  for(const path of ['/cart','/cart/','/checkout','/checkout/','/gio-hang','/gio-hang/','/thanh-toan','/thanh-toan/']){
   const r=await page.goto(FRONT+path,{waitUntil:'domcontentloaded',timeout:35000}).catch(e=>null);
   report.routes.push({path,status:r?.status()||0,url:page.url(),h1:await page.locator('h1').first().textContent().catch(()=>null)});
  }
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
  const [gateways,coupons,pages,settings]=await Promise.all([
   get('gateways','/wp-json/wc/v3/payment_gateways'),
   get('coupons','/wp-json/wc/v3/coupons?per_page=100'),
   get('pages','/wp-json/wp/v2/pages?per_page=100&status=publish&context=edit'),
   get('settings','/wp-json/wc/v3/settings/general')
  ]);
  report.woocommerceCouponSetting=settings.find(x=>x.id==='woocommerce_enable_coupons')?.value??'NOT_RETURNED';
  report.gateway=gateways.map(x=>({id:x.id,title:x.title,enabled:x.enabled,method_title:x.method_title}));
  report.coupons=coupons.filter(x=>x.status==='publish').map(x=>({id:x.id,code:x.code,discount_type:x.discount_type,amount:x.amount,minimum_amount:x.minimum_amount,individual_use:x.individual_use}));
  report.pageCandidates=pages.filter(x=>/ssr-cart|ssr-checkout|cart|checkout|thanh-toan|gio-hang/i.test(JSON.stringify(x.acf||{})+' '+x.slug+' '+x.title?.rendered)).map(x=>({id:x.id,slug:x.slug,acf:{key:x.acf?.key,action:x.acf?.action},title:x.title?.rendered}));
  report.status='PASS';save();
  console.log('AQUA_CHECKOUT_AUDIT_SUMMARY='+JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{report.status='FAIL';report.error=String(e.message||e).slice(0,500);save();console.error(report.error);process.exitCode=1;});
