'use strict';
/** Disposable anonymous cart verification. Never reaches /api/cart/checkout or creates a Woo order. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const FRONT='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-checkout-live-cart';
fs.mkdirSync(OUT,{recursive:true});
const result={project:'aquathanhxuan.com',mode:'DISPOSABLE_CART_ONLY_NO_ORDER',status:'STARTED',checks:[],cleanup:null};
const save=()=>fs.writeFileSync(OUT+'/report.json',JSON.stringify(result,null,2)+'\n');
const post=async(path,data)=>{
 const r=await fetch(FRONT+path,{method:'POST',headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data),signal:AbortSignal.timeout(40000)});
 const raw=await r.text();
 let json;try{json=JSON.parse(raw)}catch{throw Error('JSON parse failed '+path+' HTTP '+r.status+' '+raw.slice(0,120))}
 if(!r.ok||!json.ok)throw Error('Cart API '+path+' HTTP '+r.status+' msg='+JSON.stringify(json.msg||json.error||'').slice(0,300));
 return json;
};
const get=async(path)=>{
 const r=await fetch(FRONT+path,{headers:{'Cache-Control':'no-store'},signal:AbortSignal.timeout(40000)});
 const raw=await r.text();
 let json;try{json=JSON.parse(raw)}catch{throw Error('Cart read JSON failed HTTP '+r.status)}
 if(!r.ok||!json.ok)throw Error('Cart read HTTP '+r.status+' '+JSON.stringify(json.msg||'').slice(0,200));
 return json.data;
};
const getCoupons=c=>(c.coupons||[]).map(x=>String(typeof x==='string'?x:(x.coupon||x.code||'')));
(async()=>{
 let cartKey='',itemKey='';
 try{
  // Published Woo simple Product 82477, source ID 266939, price 2,700,000 VND.
  // This test never retries add to avoid duplicate quantity on ambiguous responses.
  const added=(await post('/api/cart/add',{_id:82477,quantity:1,lang:'vi',name:'',cartKey:null})).msg;
  assert(added && typeof added==='object','CoCart add result missing');
  cartKey=added.cart_key||'';
  assert(typeof cartKey==='string'&&cartKey.length>8,'No cart key after add');
  const addedItems=Array.isArray(added.items)?added.items:Object.values(added.items||{});
  assert(addedItems.length===1,'Expected one cart item in disposable session');
  itemKey=addedItems[0].item_key||'';
  assert(itemKey,'CoCart item_key missing; cannot cleanup');
  result.checks.push({step:'add_cart_item',http:'PASS',productId:82477,itemCount:1});
  save();
  const cart=await get('/api/cart?cart_key='+encodeURIComponent(cartKey));
  const subtotal=Number(cart?.totals?.subtotal||0);
  const discount=Number(cart?.totals?.discount_total||0);
  const coupons=getCoupons(cart);
  const expectedDiscount=Math.round(subtotal*0.05);
  assert(subtotal>200000,'Test product subtotal did not meet promotion threshold: '+subtotal);
  assert(coupons.includes('aqua-auto-5'),'WooCommerce virtual automatic coupon not applied: '+JSON.stringify(coupons));
  assert(discount>0,'WooCommerce returned no discount');
  assert(Math.abs(discount-expectedDiscount)<=1,
    'Discount does not equal native 5%: actual='+discount+' expected='+expectedDiscount);
  result.checks.push({step:'woo_automatic_coupon',code:'aqua-auto-5',subtotal,discount,expectedDiscount,total:Number(cart?.totals?.total||0),pass:true});
  save();
  console.log('AQUA_CART_PROMOTION_PASS='+JSON.stringify(result.checks.at(-1)));
 }catch(e){
  result.status='FAIL';result.error=String(e.message||e).slice(0,350);
  console.error('AQUA_CART_PROMOTION_FAIL='+result.error);
  process.exitCode=1;
 }finally{
  if(cartKey&&itemKey){
   try{
    const deleted=(await post('/api/cart/del',{cart_key:cartKey,item_key:itemKey})).data;
    const items=Array.isArray(deleted?.items)?deleted.items:Object.values(deleted?.items||{});
    assert.equal(items.length,0,'Disposable cart was not emptied');
    result.cleanup='PASS';console.log('AQUA_CART_CLEANUP=PASS');
   }catch(e){result.cleanup='FAIL';console.error('AQUA_CART_CLEANUP_FAIL='+String(e.message||e).slice(0,250));process.exitCode=1}
  }else{result.cleanup='NOT_POSSIBLE_NO_SESSION_KEY'}
  if(!process.exitCode)result.status='PASS';
  save();
 }
})();
