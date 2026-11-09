'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');
const urls = [
  {label:'source',url:'https://aquathanhxuan.com/danh-muc/thuong-hieu/atman/'},
  {label:'target',url:'https://aquathanhxuan.io.vn/san-pham/atman'}
];
(async()=>{
  fs.mkdirSync('artifacts/category-layout',{recursive:true});
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const report={};
    for(const vp of [{width:1440,height:900},{width:390,height:844}]){
      for(const site of urls){
        const page=await browser.newPage({viewport:vp});
        const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        const response=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:60000});
        await page.waitForTimeout(1500);
        const data=await page.evaluate(()=>{
          const take=(selector)=>[...document.querySelectorAll(selector)].slice(0,35).map(n=>{
            const r=n.getBoundingClientRect();
            return {tag:n.tagName,text:(n.textContent||'').trim().slice(0,110),
              className:typeof n.className==='string'?n.className.slice(0,140):'',
              src:n.getAttribute('src')||null,
              srcset:n.getAttribute('srcset')||null,
              background:getComputedStyle(n).backgroundImage==='none'?null:getComputedStyle(n).backgroundImage,
              w:Math.round(r.width),h:Math.round(r.height),y:Math.round(r.y)};
          });
          return {title:document.title,description:document.querySelector('meta[name="description"]')?.content||'',
            headings:take('h1,h2,h3'), images:take('main img,.page-wrapper img,.category-banner img'),
            controls:take('select,[class*="sort"],[class*="order"],[class*="breadcrumb"],[class*="banner"],[class*="recent"]'),
            productCards:take('.product-small,.product-card-img,.product-grid article,#product-grid article,main article'),
            links:take('main a[href*="san-pham/"],main a[href*="product/"]'),
            scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth};
        });
        report[site.label+'-'+vp.width]={status:response?.status(),url:page.url(),...data,errors};
        await page.screenshot({path:'artifacts/category-layout/'+site.label+'-'+vp.width+'.png',fullPage:true});
        console.log('CATEGORY_PREFLIGHT='+JSON.stringify({site:site.label,width:vp.width,status:response?.status(),title:data.title,headings:data.headings.slice(0,8),images:data.images.slice(0,7),controls:data.controls.slice(0,9),cards:data.productCards.slice(0,4),errors}).slice(0,13500));
        await page.close();
      }
    }
    fs.writeFileSync('artifacts/category-layout/report.json',JSON.stringify(report,null,2)+'\n');
  }finally{await browser.close()}
})().catch(e=>{console.error('CATEGORY_PREFLIGHT_FAIL='+e.stack);process.exitCode=1});
