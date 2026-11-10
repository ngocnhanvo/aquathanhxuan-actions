'use strict';
/** Read-only production SSR route validation. No CoCart writes, no orders. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const FRONT='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-checkout-route-live';
fs.mkdirSync(OUT,{recursive:true});
const checks=[];
const report={scope:'AQUA_CHECKOUT_ROUTES_READ_ONLY',status:'STARTED',checks,created_orders:0,created_cart_items:0};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(report,null,2)+'\n');
async function get(path){
 try{
  const response=await fetch(FRONT+path,{headers:{'Cache-Control':'no-cache','Accept':'application/json, text/html'},redirect:'follow',signal:AbortSignal.timeout(15000)});
  const body=await response.text();
  return {status:response.status,body,contentType:response.headers.get('content-type')||''};
 }catch(e){
  const reason=e instanceof Error?e.message:String(e);
  throw Error('GET '+path+' failed: '+reason);
 }
}
(async()=>{
 try{
  const specs=[
   {slug:'cart',key:'ssr-cart',action:'CartPage'},
   {slug:'checkout',key:'ssr-checkout',action:'CheckoutPage'},
   {slug:'order-received',key:'ssr-checkoutdone',action:'CheckoutDonePage'}
  ];
  const common=await get('/data/cms-common.json');
  assert.equal(common.status,200,'WordPress-derived Page index unavailable');
  const data=JSON.parse(common.body);
  for(const spec of specs){
   const rows=(data.pages||[]).filter(p=>p.key===spec.key && p.slug===spec.slug);
   assert.equal(rows.length,1,'Missing/duplicate CMS Page key '+spec.key);
   assert.equal(rows[0].action,spec.action,'Wrong WordPress component Action '+spec.key);
   checks.push({kind:'WordPress Page index',slug:spec.slug,key:spec.key,status:'PASS'});
   const row=await get('/data/page-'+spec.slug+'.json');
   assert.equal(row.status,200,'Missing exported Page cache '+spec.slug);
   const page=JSON.parse(row.body);
   assert.equal(page.key,spec.key);
   assert.equal(page.action,spec.action);
   checks.push({kind:'Published Page cache',slug:spec.slug,key:spec.key,status:'PASS'});
  }
  await Promise.all(specs.flatMap(spec=>[
   {kind:'Public rewrite route',path:'/'+spec.slug},
   {kind:'Internal SSR route',path:'/ssr/cart/'+spec.slug}
  ]).map(async spec=>{
   const response=await get(spec.path);
   checks.push({kind:spec.kind,path:spec.path,http:response.status});
   assert.equal(response.status,200,'SSR checkout route HTTP '+response.status+' at '+spec.path);
   assert(response.body.includes('<html')||response.body.includes('<!DOCTYPE'), 'Missing HTML at '+spec.path);
  }));
  const accountCandidates=(data.pages||[]).filter(p=>
    /orderhistory|order.history|lich-su|tai-khoan|account/i.test(
      [p.slug,p.key,p.action].map(v=>String(v||'')).join(' ')
    )).map(p=>({id:p.id,slug:p.slug,key:p.key,action:p.action,lang:p.lang}));
  console.log('AQUA_ACCOUNT_PAGE_DISCOVERY='+JSON.stringify(accountCandidates));
  checks.push({kind:'WordPress account Page candidates',pages:accountCandidates});
  const accountPage=await get('/lich-su-mua-hang');
  checks.push({kind:'Customer account-history route',path:'/lich-su-mua-hang',http:accountPage.status});
  assert.equal(accountPage.status,200,
   'Account link in WooCommerce new-account emails must open published Astro history route');
  const gateway=await get('/api/cart/payment-methods');
  assert.equal(gateway.status,200,'Payment gateway API unavailable');
  const methods=JSON.parse(gateway.body);
  assert(methods.ok===true && Array.isArray(methods.gateways),'Invalid payment methods');
  const qaConfig=JSON.parse(fs.readFileSync('qa-requests/aqua-checkout-route-live.json','utf8'));
  assert.equal(typeof qaConfig.expected_bacs,'boolean','Audit must specify BACS readiness observed from WP');
  assert(methods.gateways.some(m=>m.id==='onepayus'),'Enabled OnePay gateway missing');
  assert.equal(methods.gateways.some(m=>m.id==='bacs'),qaConfig.expected_bacs,
    'BACS visibility must match WordPress bank account readiness');
  assert(!methods.gateways.some(m=>['cheque','cod'].includes(m.id)), 'Inactive gateways must be hidden');
  checks.push({kind:'Live WooCommerce payment methods',method_ids:methods.gateways.map(m=>m.id),status:'PASS'});
  report.status='PASS';save();
  console.log('AQUA_CHECKOUT_ROUTE_LIVE_PASS='+JSON.stringify({checks,created_orders:0,created_cart_items:0}));
 }catch(e){report.status='FAIL';report.error=String(e.message||e).slice(0,360);save();console.error('AQUA_CHECKOUT_ROUTE_LIVE_FAIL='+report.error);process.exitCode=1;}
})();
