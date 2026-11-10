'use strict';
/**
 * Production customer AUTH contract with ONE temporary synthetic Woo customer.
 * WRITE_SCOPE: create exactly one QA-only customer, then permanently delete
 * that specific account in finally. NEVER create orders, alter prices, coupons,
 * shipping/gateways, or log cookies, passwords, emails or Woo credentials.
 */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const FRONT='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-customer-session-qa';
fs.mkdirSync(OUT,{recursive:true});
const marker='qa_aqua_'+crypto.randomBytes(7).toString('hex');
const email=marker+'@example.invalid';
const password=crypto.randomBytes(32).toString('base64url')+'Z9!';
const cookieName='esc_user_session';
const result={
 scope:'ONE_TEMPORARY_SYNTHETIC_CUSTOMER_AND_CLEANUP',
 status:'STARTED',
 checks:[],created_orders:0,created_payments:0,
 customer_created:false,customer_deleted:false,cleanup:'NOT_STARTED'
};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(result,null,2)+'\n');
const fail=(s)=>{throw new Error(s)};
let browser,admin,customerId=0,nonce='';
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,
  'Missing authorized WP admin secrets; refusing to create test customer');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  admin=await browser.newContext({ignoreHTTPSErrors:false});
  const page=await admin.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:40000});
  const nonceResponse=await admin.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:25000});
  assert.equal(nonceResponse.status(),200,'Cannot read authenticated WordPress REST nonce');
  nonce=(await nonceResponse.text()).trim();
  assert(/^[\w-]{8,}$/.test(nonce),'Invalid WP REST nonce');
  async function woo(method,path,body){
   const response=await admin.request.fetch(WP+path,{
    method,headers:{'X-WP-Nonce':nonce,'Content-Type':'application/json'},
    ...(body===undefined?{}:{data:JSON.stringify(body)}),timeout:30000
   });
   const raw=await response.text();
   let data;try{data=JSON.parse(raw)}catch{fail('Invalid WooCommerce response at '+method+' '+path)}
   if(!response.ok()) fail('WooCommerce '+method+' '+path.split('?')[0]+' HTTP '+response.status()+
       ' code='+String(data?.code||'').slice(0,60));
   return data;
  }
  const index=await admin.request.get(WP+'/wp-json/',{timeout:20000});
  assert(index.ok(),'WordPress API index must be reachable');
  const routes=(await index.json()).routes||{};
  assert(Array.isArray(routes['/custom/v1/login']?.methods) &&
    routes['/custom/v1/login'].methods.includes('POST'),
    'WordPress custom/v1/login POST endpoint is missing; refuse to create a temporary customer');
  result.checks.push({check:'WordPress REST customer login POST route registered',status:'PASS'});save();
  const list=await woo('GET','/wp-json/wc/v3/customers?email='+encodeURIComponent(email));
  assert(Array.isArray(list)&&list.length===0,'QA marker already exists; aborting to protect real records');
  const created=await woo('POST','/wp-json/wc/v3/customers',{
   username:marker,email,password,first_name:'QA',last_name:'Aqua',
   billing:{first_name:'QA',last_name:'Aqua',email}
  });
  assert(Number.isSafeInteger(created?.id)&&created.id>0,'Woo customer creation did not return an ID');
  customerId=created.id;result.customer_created=true;save();
  assert(created.email===email && created.username===marker,'Created customer mismatched generated marker');
  const initialOrders=await woo('GET','/wp-json/wc/v3/orders?customer='+customerId+'&per_page=10');
  assert(Array.isArray(initialOrders)&&initialOrders.length===0,'Unexpected orders for newly created test customer');
  result.checks.push({check:'One temporary synthetic WooCommerce customer, no orders',status:'PASS'});save();

  // Browser auth is isolated from the WordPress administrator's cookies.
  const buyer=await browser.newContext({ignoreHTTPSErrors:false});
  try{
   const loginRes=await buyer.request.post(FRONT+'/api/user/login',{
    data:JSON.stringify({username:marker,password,rememberme:false}),
    headers:{'Content-Type':'application/json'},timeout:25000
   });
   const login=await loginRes.json().catch(()=>null);
   assert.equal(loginRes.status(),200,'Astro /api/user/login returned HTTP '+loginRes.status());
   assert(login?.ok===true,'WordPress login was not accepted by Astro');
   const cookies=(await buyer.storageState()).cookies;
   const session=cookies.find(c=>c.name===cookieName&&c.domain.includes('aquathanhxuan.io.vn'));
   assert(session && /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(session.value),
    'Missing HMAC-signed Astro session after valid WordPress login');
   assert(session.httpOnly && session.secure && session.sameSite==='Lax',
    'Customer session must be HttpOnly, Secure and SameSite=Lax');
   result.checks.push({check:'WordPress login issues secure signed Astro session',status:'PASS'});save();

   const infoResponse=await buyer.request.get(FRONT+'/api/user/info',{timeout:20000});
   const info=await infoResponse.json();
   assert.equal(infoResponse.status(),200);
   assert.equal(Number(info.id),customerId,'Signed session returned another WooCommerce customer');
   result.checks.push({check:'Signed session resolves only the created customer',status:'PASS'});save();

   const ordersResponse=await buyer.request.get(FRONT+'/api/user/order',{timeout:20000});
   assert.equal(ordersResponse.status(),200,'Signed account unable to access its own empty history');
   const orderData=await ordersResponse.json();
   assert(orderData.ok===true&&Array.isArray(orderData.orders)&&orderData.orders.length===0,
    'New buyer order history must be empty');
   assert.match(ordersResponse.headers()['cache-control']||'',/no-store/);
   result.checks.push({check:'Signed customer can access own empty orders, no-store',status:'PASS'});save();

   const forged=await browser.newContext();
   try{
    const unsigned=encodeURIComponent(JSON.stringify({user:{id:customerId,email}}));
    const denied=await forged.request.get(FRONT+'/api/user/order',{
     headers:{Cookie:cookieName+'='+unsigned},timeout:20000
    });
    assert.equal(denied.status(),401,'Unsigned impersonation of QA customer must be denied');
    const changed=session.value.slice(0,-1)+(session.value.endsWith('A')?'B':'A');
    const tampered=await forged.request.get(FRONT+'/api/user/order',{
     headers:{Cookie:cookieName+'='+changed},timeout:20000
    });
    assert.equal(tampered.status(),401,'Tampered signed cookie must be denied');
    result.checks.push({check:'Forged/unsigned and tampered signed session denied',status:'PASS'});save();
   }finally{await forged.close()}
   // Log out and verify the cookie is no longer usable in this browser.
   const logout=await buyer.request.post(FRONT+'/api/user/logout',{timeout:20000});
   assert(logout.ok(),'Astro logout route failed');
   const postLogout=await buyer.request.get(FRONT+'/api/user/order',{timeout:20000});
   assert.equal(postLogout.status(),401,'Order history not revoked from browser after logout');
   result.checks.push({check:'Logout removes order history access',status:'PASS'});save();
  }finally{await buyer.close()}
  result.status='PASS';
  console.log('AQUA_CUSTOMER_SIGNED_SESSION_PASS='+JSON.stringify({
   checks:result.checks,created_orders:0,created_payments:0
  }));
 }catch(e){
  result.status='FAIL';result.error=String(e?.message||e).slice(0,350);
  console.error('AQUA_CUSTOMER_SIGNED_SESSION_FAIL='+result.error);process.exitCode=1;
 }finally{
  // Cleanup ALWAYS, even on a failed login/API assertion. Never delete a
  // record not proved to use this run's synthetic username+email marker.
  try{
   if(admin && nonce){
    const query=await admin.request.get(WP+'/wp-json/wc/v3/customers?email='+encodeURIComponent(email),{
     headers:{'X-WP-Nonce':nonce},timeout:25000
    });
    assert(query.ok(),'Cannot query temporary customer for safe cleanup');
    const items=await query.json();
    assert(Array.isArray(items),'Unexpected Woo customer inventory');
    const matches=items.filter(x=>x.username===marker&&x.email===email);
    assert(matches.length<=1,'Refusing to clean up ambiguous WordPress customer records');
    if(matches.length===1){
     const found=matches[0];
     if(customerId)assert.equal(found.id,customerId,'Cleanup customer ID drift');
     const deleted=await admin.request.delete(WP+'/wp-json/wc/v3/customers/'+found.id+'?force=true',{
      headers:{'X-WP-Nonce':nonce},timeout:30000
     });
     const payload=await deleted.json().catch(()=>({}));
     assert(deleted.ok() && Number(payload.id)===found.id,'Cannot delete temporary customer');
     customerId=found.id;
    }
    const verified=await admin.request.get(WP+'/wp-json/wc/v3/customers?email='+encodeURIComponent(email),{
     headers:{'X-WP-Nonce':nonce},timeout:20000
    });
    assert(verified.ok(),'Cannot verify cleanup');
    const remaining=(await verified.json()).filter(x=>x.username===marker&&x.email===email);
    assert.equal(remaining.length,0,'Temporary QA customer still in WordPress');
    result.cleanup='PASS';result.customer_deleted=true;
   }else{result.cleanup='NOT_VERIFIED';if(customerId)process.exitCode=1}
  }catch(e){
   result.cleanup='FAIL';result.cleanup_error=String(e?.message||e).slice(0,240);
   process.exitCode=1;
   console.error('AQUA_CUSTOMER_CLEANUP_FAIL='+result.cleanup_error);
  }
  save();
  console.log('AQUA_CUSTOMER_CLEANUP='+result.cleanup);
  if(browser)await browser.close();
 }
})();
