'use strict';
/** Scoped WooCommerce tax-inclusive settings. Does NOT create orders or customers. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const FRONT='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-tax-inclusive';
fs.mkdirSync(OUT,{recursive:true});
const wanted=[
  {id:'woocommerce_prices_include_tax',value:'yes'},
  {id:'woocommerce_tax_display_shop',value:'incl'},
  {id:'woocommerce_tax_display_cart',value:'incl'},
];
const report={project:'Aqua Thanh Xuan',scope:wanted.map(v=>v.id),status:'STARTED',settings:[],writes:[],cart:null,cleanup:null,orders_created:0};
const save=()=>fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');
const num=v=>Number(v||0);
const nearly=(a,b)=>Math.abs(a-b)<=2;
let cartKey='',itemKey='';
async function post(path,data){
 const response=await fetch(FRONT+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(40000)});
 const raw=await response.text();let json;try{json=JSON.parse(raw)}catch{throw Error('Cart JSON invalid: '+path)}
 assert(response.ok&&json.ok,'Cart API '+path+' HTTP '+response.status+' '+String(json.msg||'').slice(0,150));
 return json;
}
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
  assert(nonceRes.ok(),'Cannot read REST nonce');
  const headers={'X-WP-Nonce':(await nonceRes.text()).trim(),'Content-Type':'application/json'};
  async function woo(method,id,value){
    const response=await page.request.fetch(WP+'/wp-json/wc/v3/settings/tax/'+id,{
      method,headers,...(value?{data:{value}}:{}),timeout:30000
    });
    const body=await response.text();
    assert(response.ok(),method+' Woo setting '+id+' HTTP '+response.status()+' '+body.slice(0,180));
    return JSON.parse(body);
  }
  // Read ALL settings before the first write.
  const before=[];
  for(const target of wanted){
    const current=await woo('GET',target.id);
    assert.equal(String(current.id),target.id,'Unexpected Woo setting ID');
    assert(['yes','no','incl','excl'].includes(String(current.value)),
      'Unexpected existing setting '+target.id+'; refusing write');
    before.push({...target,was:String(current.value)});
    report.settings.push({id:target.id,from:String(current.value),to:target.value});
  }
  save();
  for(const setting of before){
    if(setting.was!==setting.value){
      await woo('PUT',setting.id,setting.value);
      report.writes.push(setting.id);
    }
    const confirmed=await woo('GET',setting.id);
    assert.equal(String(confirmed.value),setting.value,'Setting not persisted: '+setting.id);
    save();
  }
  // Test one disposable anonymous Woo cart. Never send /api/cart/checkout.
  const added=(await post('/api/cart/add',{_id:82477,quantity:1,lang:'vi',name:'',cartKey:null})).msg;
  assert(added&&typeof added==='object','No cart response');
  cartKey=String(added.cart_key||'');
  const item=(Array.isArray(added.items)?added.items:Object.values(added.items||{}))[0];
  itemKey=String(item?.item_key||'');
  assert(cartKey&&itemKey,'Disposable cart key/item key unavailable');
  const r=await fetch(FRONT+'/api/cart?cart_key='+encodeURIComponent(cartKey),{signal:AbortSignal.timeout(40000)});
  const json=await r.json();
  assert(r.ok&&json.ok&&json.data,'Woo cart refresh failed');
  const totals=json.data.totals||{};
  const subtotal=num(totals.subtotal)+num(totals.subtotal_tax);
  const discount=num(totals.discount_total)+num(totals.discount_tax);
  const total=num(totals.total);
  const shipping=num(totals.shipping_total)+num(totals.shipping_tax);
  const coupons=(json.data.coupons||[]).map(c=>String(typeof c==='string'?c:(c.coupon||c.code||'')));
  report.cart={product:82477,subtotal,discount,total,shipping,coupons,subtotalTax:num(totals.subtotal_tax),totalTax:num(totals.total_tax)};
  save();
  assert(nearly(subtotal,2700000),'Gross product list price changed unexpectedly');
  assert(coupons.includes('aqua-auto-5'),'Native Woo coupon missing');
  assert(nearly(discount,135000),'Native Woo coupon must reduce 5% of gross price');
  assert(nearly(total,subtotal-discount+shipping),'Additional tax surcharge still being charged');
  report.status='PASS';
  console.log('AQUA_TAX_INCLUDED_CART_PASS='+JSON.stringify(report.cart));
 }finally{await browser.close()}
})().catch(e=>{report.status='FAIL';report.error=String(e?.message||e).slice(0,440);process.exitCode=1;})
.finally(async()=>{
 if(cartKey&&itemKey){
  try{
   const deleted=(await post('/api/cart/del',{cart_key:cartKey,item_key:itemKey})).data;
   assert.equal((deleted?.items||[]).length,0,'Disposable cart not empty after cleanup');
   report.cleanup='PASS';
  }catch(e){report.cleanup='FAIL: '+String(e?.message||e).slice(0,130);process.exitCode=1}
 }else{report.cleanup='NO_CART_CREATED'}
 save();
 console.log('AQUA_TAX_INCLUDED_STATUS='+report.status+' CLEANUP='+report.cleanup+' WRITES='+JSON.stringify(report.writes));
 if(report.error)console.error('AQUA_TAX_INCLUDED_FAIL='+report.error);
});
