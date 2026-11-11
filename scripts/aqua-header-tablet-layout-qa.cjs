'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const origin='https://aquathanhxuan.io.vn';
const expected='53bf9cf226b28fdecae47fa658fb6882ce5eebe3';
const output='artifacts/aqua-header-tablet-layout';
fs.mkdirSync(output,{recursive:true});

const snapshot=()=> {
  const $=s=>document.querySelector(s);
  const rect=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom,height:r.height};};
  const root=$('#header-brandbar');
  const search=$('#header-desktop-search');
  const actions=search?.nextElementSibling;
  const logo=$('#header-brandbar a[aria-label="Về trang chủ"]');
  const trigger=actions?.querySelector('.js-account-toggle');
  const accountLabel=actions?.querySelector('.js-account-label');
  const cart=actions?.querySelector('.js-cart-navigation');
  const cartLabel=cart?.querySelector('span:last-child');
  return {
    width:innerWidth, brandbar:rect(root), logo:rect(logo),
    search:rect(search), actions:rect(actions), trigger:rect(trigger), cart:rect(cart),
    centerOffset:search?(rect(search).left+rect(search).width/2-innerWidth/2):null,
    searchDisplay:search?getComputedStyle(search).display:null,
    accountDisplay:trigger?getComputedStyle(trigger).display:null,
    accountLabelDisplay:accountLabel?getComputedStyle(accountLabel).display:null,
    cartLabelDisplay:cartLabel?getComputedStyle(cartLabel).display:null,
    brandbarOverflow:root?root.scrollWidth-root.clientWidth:null,
    accountLabelValue:accountLabel?.textContent||null,
    controls:actions?[...actions.querySelectorAll('button,a')].map(el=>({type:el.tagName,aria:el.getAttribute('aria-label'),rect:rect(el)})):[],
  };
};
(async()=>{
  const marker=await (await fetch(origin+'/aquathanhxuan-staging-build.json?headerqa='+Date.now(),{headers:{'Cache-Control':'no-cache'}})).json();
  assert.equal(marker.commit,expected,'Production source does not match header change');
  console.log('AQUA_HEADER_SOURCE_PASS='+marker.commit);
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [900,926,1032,1200,1279,1280,1440]){
      const page=await browser.newPage({viewport:{width,height:760},deviceScaleFactor:2});
      page.on('pageerror',e=>console.log('PAGE_ERROR '+width+' '+String(e).slice(0,150)));
      await page.route('**/api/user/info',route=>route.fulfill({
        status:200,contentType:'application/json',
        body:JSON.stringify({id:999999,name:'Aqua QA Example Extra Long Account Name 01234567890',email:'qa-example@example.invalid'})
      }));
      try{
        await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:60000});
        await page.locator('#header-brandbar .js-account-toggle').waitFor({state:'visible',timeout:18000});
        await page.waitForTimeout(100);
        const data=await page.evaluate(snapshot);
        assert.equal(data.searchDisplay,'flex','Desktop search unavailable at '+width);
        assert.equal(data.accountDisplay,'flex','Signed-in account control unavailable at '+width);
        assert(data.logo.right+8<=data.search.left,'Logo overlaps search at '+width+' '+JSON.stringify(data));
        assert(data.search.right+8<=data.actions.left,'Search overlaps right controls at '+width+' '+JSON.stringify(data));
        assert(data.trigger.right+4<=data.cart.left,'Account overlaps cart at '+width+' '+JSON.stringify(data));
        assert(Math.abs(data.centerOffset)<2.5,'Search not centered at '+width+' '+JSON.stringify(data));
        assert(data.brandbarOverflow<=1,'Brandbar overflows at '+width+' '+JSON.stringify(data));
        assert(width<1280 ? data.accountLabelDisplay==='none' : data.accountLabelDisplay!=='none','Unexpected account text visibility at '+width);
        await page.locator('#header-brandbar').screenshot({path:output+'/header-'+width+'.png'});
        console.log('AQUA_HEADER_LAYOUT_PASS='+JSON.stringify({width,search:data.search,logo:data.logo,actions:data.actions,account:data.trigger,cart:data.cart,centerOffset:data.centerOffset,label:data.accountLabelDisplay}));
      }finally{await page.close()}
    }
    const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    try{
      await phone.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:60000});
      assert(await phone.locator('#hamburger-btn').isVisible(),'Mobile drawer toggle missing');
      assert(await phone.locator('#mobile-search-btn').isVisible(),'Mobile search toggle missing');
      assert(!(await phone.locator('#header-desktop-search').isVisible()),'Desktop search leaked into mobile');
      await phone.locator('#header-brandbar').screenshot({path:output+'/header-390.png'});
      console.log('AQUA_HEADER_MOBILE_PASS=390');
    }finally{await phone.close()}
    console.log('AQUA_HEADER_TABLET_PRODUCTION_QA=PASS');
  }finally{await browser.close()}
})().catch(e=>{console.error('AQUA_HEADER_TABLET_PRODUCTION_QA=FAIL '+String(e.stack||e));process.exitCode=1});
