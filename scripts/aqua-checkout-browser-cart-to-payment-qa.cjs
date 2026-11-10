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
  // Verify the exact cart defect reported by the buyer:
  // real thumbnail, correct individual and line prices, VAT already included.
  await page.waitForFunction(() => {
    const img=document.querySelector('#cart-list-container img');
    const prices=[...document.querySelectorAll('#cart-list-container p.font-bold.text-primary')];
    return img?.complete && img?.naturalWidth > 0 && !img.src.startsWith('data:') &&
      prices.length >= 2 && prices.every(x => /2[.,]700[.,]000/.test(x.textContent||'')) &&
      /2[.,]565[.,]000/.test(document.querySelector('#summary-total')?.textContent||'');
  },null,{timeout:20000});
  const productImage=await page.locator('#cart-list-container img').first().getAttribute('src');
  const cartPrices=await page.locator('#cart-list-container p.font-bold.text-primary').allTextContents();
  const cartSubtotal=await page.locator('#summary-subtotal').textContent();
  const cartDiscount=await page.locator('#summary-discount-total').textContent();
  const cartTotal=await page.locator('#summary-total').textContent();
  assert(/2[.,]700[.,]000/.test(cartSubtotal||''),'Gross product subtotal must include VAT');
  assert(/135[.,]000/.test(cartDiscount||''),'Woo automatic 5% coupon must be preserved');
  assert(/2[.,]565[.,]000/.test(cartTotal||''),'VAT must not be added to total a second time');
  assert.equal(await page.locator('#summary-tax-wrapper').count(),0,'Cart must not show VAT surcharge');
  result.checks.push({
    stage:'Cart thumbnail, unit/line price and total include VAT',status:'PASS',
    image_loaded:true,image_src:productImage,prices:cartPrices,
    gross_subtotal:cartSubtotal,discount:cartDiscount,total:cartTotal
  });save();
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
    const c=document.querySelector('#checkout-cart-container');
    return c && /2[.,]700[.,]000/.test(c.textContent||'') &&
      /2[.,]565[.,]000/.test(c.textContent||'');
  },null,{timeout:15000});
  assert(await page.locator('#checkout-cart-container img').first().evaluate(
    img=>img instanceof HTMLImageElement && img.complete && img.naturalWidth>0
  ),'Checkout product thumbnail must load');
  assert.equal(await page.locator('#checkout-cart-container').getByText('Thuế', {exact:true}).count(),0,
    'Checkout must not add a separate VAT surcharge');
  result.checks.push({stage:'Checkout thumbnail and tax-inclusive total',status:'PASS'});save();

  await page.waitForFunction(()=>{
   const el=document.querySelector('#checkout-payment-methods');
   return !!el?.querySelector('input[name="payment_method"]');
  },{timeout:20000}).catch(()=>{throw Error('Payment methods did not load from WordPress');});
  const methods=await page.locator('input[name="payment_method"]').evaluateAll(els=>els.map(e=>e.value));
  const qaConfig=JSON.parse(fs.readFileSync('qa-requests/aqua-checkout-browser-no-order.json','utf8'));
  assert.equal(typeof qaConfig.expected_bacs,'boolean','Audit must specify WordPress BACS account readiness');
  assert(methods.includes('onepayus'),'Enabled OnePay gateway missing');
  assert.equal(methods.includes('bacs'),qaConfig.expected_bacs,
    'BACS should be selectable only when WordPress has a bank recipient');
  assert(!methods.includes('cod')&&!methods.includes('cheque'),'Inactive payment method shown');
  assert(await page.locator('#submit-checkout-btn').isDisabled(),'Checkout should not submit before accepting terms');
  result.checks.push({stage:'Native Woo gateways & disabled pre-terms submit',status:'PASS',gateways:methods});save();
  await page.screenshot({path:OUT+'/checkout.png',fullPage:false});

  // Exercise the complete browser submit path WITHOUT reaching WordPress:
  // Playwright intercepts POST /api/cart/checkout and returns a mock rejection.
  // This verifies billing, native gateway selection, terms, and idempotency ID.
  const intercepted=[];
  await page.route('**/api/cart/checkout',async route=>{
   const request=route.request();
   assert.equal(request.method(),'POST','Checkout must use POST');
   intercepted.push(request.postDataJSON());
   await route.fulfill({
    status:422,contentType:'application/json',
    body:JSON.stringify({ok:false,msg:'QA_ONLY_INTERCEPTED_NO_ORDER'})
   });
  });
  const fields={
   billing_tenchuthe:'Khách QA',
   billing_sodienthoai:'0900000000',
   billing_email:'checkout-fixture@example.invalid',
   billing_state:'Hà Nội',
   billing_city:'Hà Đông',
   billing_diachi:'Địa chỉ kiểm thử, không giao hàng'
  };
  for(const [name,value] of Object.entries(fields)){
   await page.locator('input[name="'+name+'"]').fill(value);
  }
  await page.locator('input[name="payment_method"][value="onepayus"]').check();
  await page.locator('#terms-checkbox').check();
  assert(!(await page.locator('#submit-checkout-btn').isDisabled()),
   'Form should enable after selecting a valid gateway and accepting terms');
  for(let attempt=0;attempt<2;attempt++){
   await page.locator('#submit-checkout-btn').click();
   await page.waitForFunction((n)=>document.querySelector('#checkout-error')?.textContent?.includes('QA_ONLY_INTERCEPTED_NO_ORDER')
    && document.querySelector('#checkout-error')?.classList?.contains('hidden')===false, null,{timeout:15000});
   assert.equal(intercepted.length,attempt+1,'Checkout request must be intercepted exactly once per click');
  }
  const first=intercepted[0],second=intercepted[1];
  assert.equal(first.cartKey,cartKey,'Checkout must carry original anonymous Woo cart key');
  assert.equal(first.payment_method,'onepayus','Checkout must submit selected enabled WordPress gateway');
  assert.equal(first.billing.email,fields.billing_email,'Checkout email must match input');
  assert.equal(first.billing.address_1,fields.billing_diachi,'Checkout shipping/billing address must match');
  assert.equal(first.billing.state,fields.billing_state,'Checkout province must match input');
  assert(first.terms===true,'Checkout requires consent');
  assert(/^[a-zA-Z0-9_-]{16,64}$/.test(first.checkout_request_id),'Missing safe idempotency token');
  assert.equal(first.checkout_request_id,second.checkout_request_id,
   'Network retry must reuse checkout attempt ID instead of creating a second order');
  result.checks.push({
   stage:'Client checkout POST intercepted; retry idempotency',status:'PASS',
   calls_intercepted:intercepted.length,same_token:true,order_api_called:false
  });save();

  // Create-account form follows the exact same checkout payload path, but
  // Playwright intercepts the request BEFORE it reaches any Woo API.
  // No WordPress customer, email or payment is created in this test.
  await page.locator('#createaccount').check();
  const passwordInput=page.locator('#account_password');
  await passwordInput.waitFor({state:'visible',timeout:8000});
  const fakePassword='QA_ONLY_example_password_123';
  await passwordInput.fill(fakePassword);
  const accountResponse=page.waitForResponse(res=>
    res.url().includes('/api/cart/checkout') &&
    res.request().method()==='POST',{timeout:15000});
  await page.locator('#submit-checkout-btn').click();
  await accountResponse;
  assert.equal(intercepted.length,3,'Account checkbox should send exactly one checkout POST');
  assert.equal(intercepted[2].create_account,true,'Account checkbox must be carried through checkout');
  assert.equal(intercepted[2].account_password,fakePassword,'Account password must be carried only in POST');
  assert.equal(intercepted[2].checkout_request_id,first.checkout_request_id,
   'Account preference update must not create a new checkout attempt for the same cart');
  assert.equal(intercepted[2].billing.email,fields.billing_email,'Account email must match billing email');
  result.checks.push({
    stage:'Account-creation checkout POST intercepted',status:'PASS',
    created_accounts:0,password_sent_via_post:true,same_cart_token:true
  });save();

  // Responsive checkout viewport: no form clipping or horizontal overflow.
  await page.setViewportSize({width:390,height:844});
  const formBox=await page.locator('#checkout-form').boundingBox();
  assert(formBox && formBox.x>=-1 && formBox.x+formBox.width<=392,'Checkout form clipped on mobile');
  await page.screenshot({path:OUT+'/checkout-mobile.png',fullPage:false});
  result.checks.push({stage:'Mobile checkout form fits viewport',status:'PASS',width:390});save();

  // Buyer account history must be a real WordPress-driven Astro route and
  // must show a login form to guests, not any other customer's order data.
  const historyRes=await page.goto(FRONT+'/lich-su-mua-hang',{
   waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(historyRes?.status(),200,'Woo account email history URL must work');
  await page.locator('h1').filter({hasText:'Lịch sử đơn hàng'}).waitFor({timeout:12000});
  await page.locator('#login-form-wrapper').waitFor({state:'visible',timeout:20000});
  assert(await page.locator('#login-form').isVisible(),
   'Anonymous buyer must be shown a WordPress login form, not order data');
  const privateData=await page.request.get(FRONT+'/api/user/order',{timeout:15000});
  assert.equal(privateData.status(),401,'Guest order history API must deny access');
  await page.screenshot({path:OUT+'/history-mobile-guest.png',fullPage:false});
  result.checks.push({
   stage:'OrderHistoryPage real CMS route and guest privacy',status:'PASS',
   http:200,guest_order_api_http:401,guest_login_form_visible:true
  });save();
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
