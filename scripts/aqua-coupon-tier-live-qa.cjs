'use strict';
/** Check exact 259k/1.295m tiers with a real, disposable Woo cart. No order API calls. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const ADMIN='https://admin.aquathanhxuan.io.vn';
const FRONT='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-coupon-tier-live';
fs.mkdirSync(OUT,{recursive:true});
const report={status:'STARTED',scope:'DISPOSABLE_WOO_CART_NO_ORDERS',cases:[],orders_created:0,temporary_created:0,cleanup_remaining:0};
const save=()=>fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');
async function post(path,data){
 const r=await fetch(FRONT+path,{method:'POST',headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data),signal:AbortSignal.timeout(40000)});
 const j=await r.json();
 assert(r.ok&&j.ok,'Cart POST failed '+path+' HTTP '+r.status+' error='+String(j.msg||j.error||'').slice(0,120));
 return j;
}
async function get(path){
 const r=await fetch(FRONT+path,{headers:{'Cache-Control':'no-store'},signal:AbortSignal.timeout(40000)});
 const j=await r.json();
 assert(r.ok&&j.ok,'Cart GET failed '+path+' HTTP '+r.status);
 return j.data;
}
const codes=c=>(c?.coupons||[]).map(x=>String(typeof x==='string'?x:x.coupon||x.code||'').toLowerCase());
async function verifyCase(productId,quantity,expectCode,percent){
 let cartKey='',itemKey='';
 const test={quantity,expected:expectCode,percent,cleaned:false};
 report.cases.push(test);save();
 try {
  const added=(await post('/api/cart/add',{_id:productId,quantity,lang:'vi',name:'',cartKey:null})).msg;
  cartKey=added?.cart_key||'';
  assert(typeof cartKey==='string'&&cartKey.length>8,'No cart key after add');
  const items=Array.isArray(added?.items)?added.items:Object.values(added?.items||{});
  assert(items.length===1,'Unexpected cart count');
  itemKey=items[0].item_key||'';
  assert(itemKey,'No item key for cart cleanup');
  const cart=await get('/api/cart?cart_key='+encodeURIComponent(cartKey));
  const subtotal=Number(cart?.totals?.subtotal||0);
  const discount=Number(cart?.totals?.discount_total||0);
  const actualCodes=codes(cart);
  assert(subtotal===259000*quantity,'Unexpected product subtotal: '+subtotal);
  assert.deepEqual(actualCodes,[expectCode],'Incorrect group-exclusive coupon for '+subtotal+': '+JSON.stringify(actualCodes));
  assert(Math.abs(discount-Math.round(subtotal*percent/100))<=1,'Wrong Woo native discount: '+discount);
  test.subtotal=subtotal;
  test.discount=discount;
  test.total=Number(cart?.totals?.total||0);
  test.applied=actualCodes;
  assert(test.total===subtotal-discount,'Total mismatch');
  test.pass=true;save();
 }finally{
  if(cartKey&&itemKey){
   try{
    const deleted=(await post('/api/cart/del',{cart_key:cartKey,item_key:itemKey})).data;
    const rest=Array.isArray(deleted?.items)?deleted.items:Object.values(deleted?.items||{});
    assert(rest.length===0,'Disposable cart not cleaned');
    test.cleaned=true;
   }catch(e){test.cleanup_error=String(e.message||e).slice(0,180);report.cleanup_remaining++;process.exitCode=1;}
  }else{test.cleanup_error='No session key';report.cleanup_remaining++;process.exitCode=1;}
  save();
 }
}
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WordPress login unavailable');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let productId=0;
 try{
  const page=await browser.newPage();
  await page.goto(ADMIN+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const n=await page.request.get(ADMIN+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert(n.ok(),'Could not read WordPress REST nonce');
  const nonce=(await n.text()).trim();
  const q=await page.request.get(ADMIN+'/wp-json/wc/v3/products?search=Dennerle&per_page=100',{headers:{'X-WP-Nonce':nonce},timeout:40000});
  assert(q.ok(),'Cannot fetch Woo published products');
  const products=await q.json();
  assert(Array.isArray(products),'Product payload is not array');
  const matching=products.filter(p=>p.status==='publish'&&p.type==='simple'&&
   /scaper/i.test(String(p.name||''))&&Number(p.price)===259000);
  assert(matching.length>=1,'Could not locate real 259k Dennerle Scaper product');
  productId=matching[0].id;
  report.product_id=productId;
  save();
 }finally{await browser.close();}
 await verifyCase(productId,1,'mf5',5);
 await verifyCase(productId,5,'mf10',10);
 assert(report.cleanup_remaining===0&&report.cases.every(c=>c.pass&&c.cleaned),'Cleanup or coupon regression');
 report.status='PASS';save();
 console.log('AQUA_COUPON_TIER_LIVE_PASS='+JSON.stringify(report));
})().catch(e=>{
 report.status='FAIL';report.error=String(e.message||e).slice(0,450);save();
 console.error('AQUA_COUPON_TIER_LIVE_FAIL='+report.error);
 process.exitCode=1;
});
