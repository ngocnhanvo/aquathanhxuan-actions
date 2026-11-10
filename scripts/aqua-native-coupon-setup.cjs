'use strict';
// Scoped migration: one real WooCommerce coupon. No orders, products, or unrelated CMS records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
const WP = 'https://admin.aquathanhxuan.io.vn';
const CODE = 'aqua-auto-5';
const OUT = 'artifacts/aqua-native-coupon';
fs.mkdirSync(OUT, {recursive:true});
const report = {scope:'ONLY_WOO_COUPON_aqua-auto-5', status:'STARTED', changed:0, skipped_unchanged:0, temporary_created:0, cleanup_remaining:0};
const save = () => fs.writeFileSync(OUT+'/result.json', JSON.stringify(report,null,2)+'\n');
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD, 'WordPress credentials unavailable in workflow');
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page = await browser.newPage();
  await page.goto(WP+'/wp-login.php', {waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'), {timeout:50000});
  const nonceResponse = await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:20000});
  assert.equal(nonceResponse.status(),200,'Could not get WordPress REST nonce');
  const nonce=(await nonceResponse.text()).trim();
  assert(/^[\w-]{8,}$/.test(nonce),'Invalid WordPress REST nonce');
  const headers={'X-WP-Nonce':nonce,'Content-Type':'application/json'};
  async function rest(method,path,body){
   const r=await page.request.fetch(WP+path,{method,headers,data:body===undefined?undefined:JSON.stringify(body),timeout:40000});
   const raw=await r.text();
   let obj;try{obj=JSON.parse(raw)}catch{throw Error(method+' '+path+' HTTP '+r.status()+' returned non-JSON')};
   if(!r.ok())throw Error(method+' '+path+' HTTP '+r.status()+' '+String(obj.code||obj.message||'').slice(0,140));
   return obj;
  }
  const list=await rest('GET','/wp-json/wc/v3/coupons?search='+encodeURIComponent(CODE)+'&per_page=100');
  assert(Array.isArray(list),'Expected WooCommerce coupons array');
  const matching=list.filter(x=>String(x.code||'').toLowerCase()===CODE);
  assert(matching.length<=1,'Multiple coupon records match campaign code');
  const expected={code:CODE,discount_type:'percent',amount:'5',minimum_amount:'200000',individual_use:false,exclude_sale_items:false,free_shipping:false};
  const before=matching[0]||null;
  report.before=before?{id:before.id,code:before.code,discount_type:before.discount_type,amount:before.amount,minimum_amount:before.minimum_amount,individual_use:before.individual_use,exclude_sale_items:before.exclude_sale_items,free_shipping:before.free_shipping}:null;
  save();
  let coupon=before;
  if(!coupon){
   // A native published WC Coupon is required. Existing virtual coupon cannot be reused as a persisted record.
   coupon=await rest('POST','/wp-json/wc/v3/coupons',expected);
   report.changed=1; report.action='CREATE'; report.id=coupon.id; save();
  } else {
   const differing=Object.fromEntries(Object.entries(expected).filter(([k,v])=>String(coupon[k])!==String(v)));
   if(Object.keys(differing).length){
    coupon=await rest('PUT','/wp-json/wc/v3/coupons/'+before.id,differing);
    report.changed=1;report.action='UPDATE';report.id=coupon.id;save();
   } else {report.action='REUSE';report.skipped_unchanged=1;}
  }
  assert(Number.isSafeInteger(coupon.id) && coupon.id>0,'Missing real coupon ID');
  const readback=await rest('GET','/wp-json/wc/v3/coupons/'+coupon.id);
  for(const [k,v] of Object.entries(expected)){
   assert.equal(String(readback[k]),String(v),'Persisted Woo coupon mismatch: '+k);
  }
  assert.equal(String(readback.code).toLowerCase(),CODE);
  report.after={id:readback.id,code:readback.code,status:readback.status||null,
   amount:readback.amount,discount_type:readback.discount_type,minimum_amount:readback.minimum_amount,
   individual_use:readback.individual_use,exclude_sale_items:readback.exclude_sale_items,free_shipping:readback.free_shipping};
  report.status='PASS';save();
  console.log('AQUA_NATIVE_COUPON_PASS='+JSON.stringify({action:report.action,...report.after,changed:report.changed,skipped_unchanged:report.skipped_unchanged,temporary_created:0,cleanup_remaining:0}));
 }finally{await browser.close();}
})().catch(e=>{report.status='FAIL';report.error=String(e.message||e).slice(0,400);save();console.error('AQUA_NATIVE_COUPON_FAIL='+report.error);process.exitCode=1;});
