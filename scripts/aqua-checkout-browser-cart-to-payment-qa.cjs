'use strict';
/** True browser cart -> checkout -> payment selection QA, DOES NOT submit or create an order. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const FRONT='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-browser-cart-checkout';
fs.mkdirSync(OUT,{recursive:true});
const result={scope:'PRODUCTION_CART_TO_PAYMENT_UI_NO_ORDER',status:'STARTED',checks:[],created_orders:0,cleanup:'NOT_STARTED'};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(result,null,2)+'\n');
let page,browser,cartKey='',itemKey='';
async function apiPost(path,body){
 const r=await fetch(FRONT+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});
 const raw=await r.text();
 let j;try{j=JSON.parse(raw)}catch{throw Error(path+' returned non JSON HTTP '+r.status)}
 if(!r.ok||j.ok!==true)throw Error(path+' rejected HTTP '+r.status+' '+JSON.stringify(j.msg||'').slice(0,200));
 return j;
}
(async()=>{
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  page=await browser.newPage({viewport:{width:1366,height:900}});
  const add=(await apiPost('/api/cart/add',{_id:82477,quantity:1,lang:'vi',name:'',cartKey:null})).msg;
  cartKey=add?.cart_key||'';
  itemKey=Array.isArray(add?.items)?add.items[0]?.item_key:Object.values(add?.items||{})[0]?.item_key;
  assert(cartKey.length>8 && itemKey,'No cart key/item key; cannot validate or cleanup');
  result.checks.push({stage:'Add real Woo product',status:'PASS'});save();
  const cartUrl=FRONT+'/cart?cart_key='+encodeURIComponent(cartKey);
  const c=await page.goto(cartUrl,{waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(c?.status(),200,'Cart page failed');
  await page.locator('h1').filter({hasText:'Giỏ hàng'}).waitFor({timeout:12000});
  await page.locator('#cart-content-wrapper').waitFor({timeout:5000});
  result.checks.push({stage:'SSR cart route',status:'PASS',http:200});save();
  await page.screenshot({path:OUT+'/cart.png',fullPage:false});
  const go=page.locator('#btn-proceed-checkout');
  await go.waitFor({timeout:12000});
  let href=await go.getAttribute('href');
  assert(href?.startsWith('/checkout'),'Wrong checkout destination');
  assert(href.includes('cart_key='),'Checkout must retain CoCart cart key');
  const checkout=await page.goto(FRONT+href,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(checkout?.status(),200,'Checkout SSR route failed');
  await page.locator('h1').filter({hasText:'Thanh toán'}).waitFor({timeout:12000});
  await page.locator('#checkout-form').waitFor({timeout:8000});
  result.checks.push({stage:'SSR checkout route with real cart',status:'PASS',http:200});save();
  await page.waitForFunction(()=>{
   const el=document.querySelector('#checkout-payment-methods');
   return !!el?.querySelector('input[name="payment_method"]');
  },{timeout:20000}).catch(()=>{throw Error('Payment methods did not load from WordPress');});
  const methods=await page.locator('input[name="payment_method"]').evaluateAll(els=>els.map(e=>e.value));
  assert(methods.includes('bacs')&&methods.includes('onepayus'),'Expected WordPress BACS and OnePay are missing');
  assert(!methods.includes('cod')&&!methods.includes('cheque'),'Inactive payment method shown');
  assert(await page.locator('#submit-checkout-btn').isDisabled(),'Checkout should not submit before accepting terms');
  result.checks.push({stage:'Native Woo gateways & disabled pre-terms submit',status:'PASS',gateways:methods});save();
  await page.screenshot({path:OUT+'/checkout.png',fullPage:false});
  result.status='PASS';
  console.log('AQUA_CART_CHECKOUT_BROWSER_PASS='+JSON.stringify({stages:result.checks,created_orders:0}));
 }catch(e){
  result.status='FAIL';result.error=String(e.message||e).slice(0,360);
  console.error('AQUA_CART_CHECKOUT_BROWSER_FAIL='+result.error);process.exitCode=1;
 }finally{
  if(cartKey&&itemKey){
   try{
    const deleted=(await apiPost('/api/cart/del',{cart_key:cartKey,item_key:itemKey})).data;
    assert(Object.values(deleted?.items||{}).length===0,'Temporary cart not emptied');
    result.cleanup='PASS';console.log('AQUA_CART_CHECKOUT_CLEANUP=PASS');
   }catch(e){
    result.cleanup='FAIL';console.error('AQUA_CART_CHECKOUT_CLEANUP_FAIL='+String(e.message||e).slice(0,250));process.exitCode=1;
   }
  }else result.cleanup='NO_CART_KEY_CREATED';
  save();if(browser)await browser.close();
 }
})();
