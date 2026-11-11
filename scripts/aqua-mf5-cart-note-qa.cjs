'use strict';
/** Disposable cart UI QA for WooCommerce-sourced MF5 note. NEVER creates orders. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const FRONT='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-mf5-cart-note';
fs.mkdirSync(OUT,{recursive:true});
const result={status:'STARTED',scope:'MF5_NOTE_VISIBLE_ONLY',temporary_created:0,cleanup_remaining:0,orders_created:0};
const save=()=>fs.writeFileSync(OUT+'/report.json',JSON.stringify(result,null,2)+'\n');
const parse=async r=>{const j=await r.json();assert(r.ok&&j.ok===true,'Cart HTTP '+r.status+' '+String(j.msg||j.error||'').slice(0,160));return j;};
async function post(path,body){
 return parse(await fetch(FRONT+path,{method:'POST',headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)}));
}
(async()=>{
 let cartKey='',itemKey='',browser;
 try{
  const add=(await post('/api/cart/add',{_id:82481,quantity:1,lang:'vi',name:'',cartKey:null})).msg;
  cartKey=add?.cart_key||'';
  const items=Array.isArray(add?.items)?add.items:Object.values(add?.items||{});
  itemKey=items[0]?.item_key||'';
  assert(cartKey.length>8&&itemKey,'No cart key or item key to clean');
  const cart=await parse(await fetch(FRONT+'/api/cart?cart_key='+encodeURIComponent(cartKey),{headers:{'Cache-Control':'no-store'},signal:AbortSignal.timeout(45000)}));
  const applied=(cart.data?.coupons||[]).map(c=>String(typeof c==='string'?c:c?.coupon||c?.code||'').toLowerCase());
  assert.deepEqual(applied,['mf5'],'MF10 must remain removed; MF5 only: '+JSON.stringify(applied));
  assert.equal(cart.couponNotes?.mf5,'Giảm 5% cho đơn hàng trên 200.000đ','Native coupon description missing in cart API');
  assert.equal(cart.couponNotes?.mf10,undefined,'Deleted MF10 must never appear');
  result.api={applied,description:cart.couponNotes.mf5,subtotal:Number(cart.data?.totals?.subtotal||0),discount:Number(cart.data?.totals?.discount_total||0)};
  assert(result.api.subtotal===259000,'Unexpected product subtotal');
  assert(result.api.discount===12950,'Unexpected native Woo 5% discount');
  save();

  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1250,height:900}});
  const view=await page.goto(FRONT+'/cart?cart_key='+encodeURIComponent(cartKey),{waitUntil:'domcontentloaded',timeout:45000});
  assert(view?.status()===200,'Cart route not HTTP 200');
  await page.locator('#summary-discount-wrapper').waitFor({state:'visible',timeout:18000});
  const button=page.locator('#btn-toggle-coupons');
  await button.click();
  await page.locator('#summary-coupons-accordion').getByText('Giảm 5% cho đơn hàng trên 200.000đ',{exact:true}).waitFor({state:'visible',timeout:15000});
  assert(await page.locator('#summary-coupons-accordion').getByText('mf5',{exact:true}).count()===1,'MF5 badge missing');
  assert(await page.locator('#summary-coupons-accordion').getByText('mf10',{exact:true}).count()===0,'MF10 rendered despite deletion');
  await page.screenshot({path:OUT+'/cart-desktop.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});
  assert(await page.locator('#summary-coupons-accordion').getByText('Giảm 5% cho đơn hàng trên 200.000đ',{exact:true}).isVisible(),'Description hidden on mobile');
  await page.screenshot({path:OUT+'/cart-mobile.png',fullPage:false});
  result.browser='PASS desktop_and_mobile';
  save();
 }catch(e){
  result.status='FAIL';result.error=String(e.message||e).slice(0,400);
  console.error('AQUA_MF5_NOTE_FAIL='+result.error);process.exitCode=1;
 }finally{
  try{await browser?.close();}catch{}
  if(cartKey&&itemKey){
   try{
    const deleted=(await post('/api/cart/del',{cart_key:cartKey,item_key:itemKey})).data;
    const remaining=Array.isArray(deleted?.items)?deleted.items:Object.values(deleted?.items||{});
    assert(remaining.length===0,'Disposable cart cleanup incomplete');
    result.cleanup='PASS';
    if(result.browser==='PASS desktop_and_mobile'&&result.api){
      result.status='PASS';
      console.log('AQUA_MF5_NOTE_PASS='+JSON.stringify({...result,cleanup:'PASS'}));
    }
   }catch(e){result.cleanup='FAIL';result.cleanup_remaining=1;process.exitCode=1;console.error('AQUA_MF5_NOTE_CLEANUP_FAIL='+String(e.message||e).slice(0,140));}
  }else{result.cleanup='NOT_POSSIBLE_NO_CART_KEY';result.cleanup_remaining=1;process.exitCode=1;}
  save();
 }
})();
