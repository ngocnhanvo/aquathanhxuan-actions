'use strict';
/** Enable only WooCommerce's native COD gateway for the approved checkout UX.
 * No orders, customers, coupons, shipping rules or other gateways are modified.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const OUT='artifacts/aqua-cod-gateway';
fs.mkdirSync(OUT,{recursive:true});
const result={scope:'woocommerce payment gateway cod.enabled ONLY',status:'STARTED',writes:[],orders_created:0};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(result,null,2)+'\n');
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
  assert(nonceRes.ok(),'Cannot obtain REST nonce');
  const nonce=(await nonceRes.text()).trim();
  assert(nonce.length>5,'Empty REST nonce');
  async function api(method,path,data){
   const r=await page.request.fetch(WP+path,{method,headers:{'X-WP-Nonce':nonce,'Content-Type':'application/json'},
     ...(data?{data}:{}),timeout:30000});
   const body=await r.text();
   assert(r.ok(),method+' '+path+' HTTP '+r.status()+' '+body.slice(0,180));
   return JSON.parse(body);
  }
  const path='/wp-json/wc/v3/payment_gateways/cod';
  const before=await api('GET',path);
  assert.equal(before.id,'cod','Unexpected gateway ID');
  result.before={id:before.id,enabled:before.enabled,title:before.title};
  save();
  if(before.enabled!==true){
    const changed=await api('PUT',path,{enabled:true});
    assert.equal(changed.id,'cod','Unexpected gateway after update');
    result.writes.push({gateway:'cod',field:'enabled',from:false,to:true});
  }
  const after=await api('GET',path);
  assert.equal(after.id,'cod','COD gateway missing after readback');
  assert.equal(after.enabled,true,'COD gateway was not persisted');
  result.after={id:after.id,enabled:after.enabled,title:after.title};
  result.status='PASS';save();
  console.log('AQUA_COD_GATEWAY_PASS='+JSON.stringify({before:result.before,after:result.after,writes:result.writes,orders_created:0}));
 }finally{await browser.close()}
})().catch(error=>{result.status='FAIL';result.error=String(error?.message||error).slice(0,450);save();console.error('AQUA_COD_GATEWAY_FAIL='+result.error);process.exitCode=1;});
