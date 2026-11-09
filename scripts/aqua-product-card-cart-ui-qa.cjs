'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const FRONT='https://aquathanhxuan.io.vn';
const request=JSON.parse(fs.readFileSync('qa-requests/product-card-cart-ui.json','utf8'));
assert(/^[0-9a-f]{40}$/.test(request.astro_sha));
const ART='artifacts/product-card-cart';
fs.mkdirSync(ART,{recursive:true});
const results={sha:request.astro_sha,started:new Date().toISOString(),checks:[],errors:[],status:'STARTED'};
const save=()=>fs.writeFileSync(ART+'/report.json',JSON.stringify(results,null,2)+'\n');
save();

async function deploymentReady(){
 const deadline=Date.now()+110000;
 let actual='';
 do {
  const r=await fetch(FRONT+'/aquathanhxuan-staging-build.json?qa='+Date.now(),{signal:AbortSignal.timeout(10000),headers:{'cache-control':'no-cache'}});
  if(r.ok){const obj=await r.json();actual=obj.commit;if(obj.branch==='master'&&obj.commit===request.astro_sha)return;}
  if(Date.now()+8000>=deadline)break;
  await new Promise(resolve=>setTimeout(resolve,8000));
 }while(Date.now()<deadline);
 throw Error('CARD_DEPLOY_READY_MISMATCH expected='+request.astro_sha+' actual='+actual);
}

async function run(){
 await deploymentReady();
 console.log('CARD_DEPLOY_READY='+request.astro_sha);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const cases=[
   {kind:'related',url:'/san-pham/may-sui-khi-atman-hp-12000',cardSelector:'section:has(> h3) button[data-product-card-add]'},
   {kind:'category',url:'/san-pham/thuong-hieu-chihiros',cardSelector:'button[data-product-card-add]'},
  ];
  for(const c of cases){
   for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
    const page=await context.newPage();
    let addRequests=0;
    const errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.route('**/api/cart/add',async route=>{
      addRequests++;
      const body=route.request().postDataJSON();
      assert(body._id,'Missing real product ID');
      const response={ok:true,msg:{
        cart_key:'qa-mock-cart-'+width,
        items:[{id:body._id,item_key:'fake-card-item',name:body.name,quantity:{value:1},price:'100000',slug:'card-test'}],
        currency:{currency_code:'VND'},
        totals:{subtotal:100000,total:100000,total_tax:0,discount_total:0},
        coupons:[],
      }};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
    });
    const response=await page.goto(FRONT+c.url,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(response?.status(),200,c.kind+' HTTP status '+width);
    await page.waitForLoadState('domcontentloaded');
    let buttons=page.locator(c.cardSelector);
    const count=await buttons.count();
    assert(count>0,'No add-to-cart card buttons at '+c.url+' width='+width);
    assert.equal(await page.locator('[data-product-quote-button]').count(),0,'Old quote CTA remains');
    const button=buttons.first();
    const productId=await button.getAttribute('data-product-id');
    assert(productId,'Missing actual product ID');
    assert.match(await button.innerText(),/Thêm vào giỏ hàng|Add to cart/);
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await page.waitForFunction(id=>{
      try {
       const raw=JSON.parse(localStorage.getItem('esc-cart-storage')||'{}');
       return raw.state?.items?.some(p=>String(p._id)===String(id))&&
         String(raw.state?.cartKey||'').startsWith('qa-mock-cart-');
      }catch{return false}
    },productId,{timeout:10000});
    assert.equal(addRequests,1,'Add-cart API should execute once');
    await page.waitForFunction(()=>{
      const b=document.querySelector('.js-cart-navigation .js-cart-badge');
      return b && !b.classList.contains('hidden')&&Number(b.textContent)>0;
    },null,{timeout:10000});
    assert.match(await button.innerText(),/Xem giỏ hàng|View cart/);
    assert.deepEqual(errors,[],'Browser page errors '+c.kind+' '+width);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert(overflow<=2,'Horizontal overflow '+c.kind+' '+width+' '+overflow);
    const name=c.kind+'-'+width+'.png';
    await page.screenshot({path:ART+'/'+name,fullPage:false});
    console.log('PRODUCT_CARD_CART_PASS='+JSON.stringify({kind:c.kind,width,url:c.url,cardCount:count,productId,apiRequests:addRequests,cartBadge:true}));
    results.checks.push({kind:c.kind,width,cardCount:count,productId,apiRequests:addRequests});
    save();
    await context.close();
   }
  }
  results.status='QA_PASS';
  results.finished=new Date().toISOString();save();
  console.log('PRODUCT_CARD_UI_QA_PASS='+JSON.stringify({sha:request.astro_sha,count:results.checks.length}));
 }finally{await browser.close()}
}
run().catch(e=>{results.status='QA_FAILED';results.errors.push(String(e.stack||e).slice(0,1600));save();console.error('PRODUCT_CARD_UI_QA_FAILED='+String(e.stack||e).slice(0,1600));process.exitCode=1});
