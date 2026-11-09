'use strict';
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin='https://aquathanhxuan.io.vn';
const expectedSha='80e87a245d0ca4d2d44d422eba86f1f2637f9a39';
const pages=[
 {slug:'chinh-sach-doi-tra-hang',title:'Chính sách đổi trả hàng',table:'support_policy',key:'support-policy'},
 {slug:'gioi-thieu',title:'Giới thiệu',table:'support_about',key:'support-about'},
 {slug:'dai-ly',title:'Đại lý',table:'support_dealer',key:'support-dealer'},
 {slug:'khieu-nai',title:'Khiếu nại',table:'support_complaint',key:'support-complaint'},
 {slug:'lien-he',title:'Liên hệ',table:'support_contact',key:'support-contact'}
];
(async()=>{
 const res=await fetch(origin+'/aquathanhxuan-staging-build.json?qa='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
 assert.equal(res.status,200,'Production build marker');
 const marker=await res.json();
 assert.equal(marker.commit,expectedSha,'Production build SHA');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   for(const info of pages){
    const response=await page.goto(origin+'/'+info.slug+'/?support_qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(response.status(),200,info.slug+' HTTP 200');
    const main=page.locator('[data-aqua-support-page]');
    assert.equal(await main.count(),1,'SupportPage template '+info.slug);
    assert.equal(await main.getAttribute('data-support-key'),info.key,'Support Page Action/key '+info.slug);
    const h1=main.locator('h1');
    assert.equal((await h1.innerText()).trim(),info.title,'H1 '+info.slug);
    const table=page.locator('[data-tablepress-preview="'+info.table+'"] [data-esc-source-table="'+info.table+'"]');
    assert.equal(await table.count(),1,'ESC Table data chain '+info.slug);
    assert((await table.locator('[data-esc-source-row]').count())>=6,'Editable section rows '+info.slug);
    assert(await table.locator('.support-section__lead').count()===1,'Hero content missing '+info.slug);
    assert(await table.locator('.support-section__feature').count()>=2,'Feature cards missing '+info.slug);
    assert(await table.locator('.support-section__step').count()>=3,'Steps missing '+info.slug);
    const description=await page.locator('meta[name="description"]').getAttribute('content');
    assert(description && description.trim().length>=30,'SEO meta description missing '+info.slug);
    const footer=page.locator('#footer-policy-title').locator('..');
    assert(await footer.count(),'Footer missing');
    const urls=await page.locator('footer a[href^="/"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
    for(const item of pages)assert(urls.some(url=>url===('/'+item.slug)),'Footer link missing '+item.slug);
    const geometry=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert(geometry.width<=geometry.viewport+2,'Horizontal overflow '+info.slug+' '+JSON.stringify(geometry));
    if(info.slug==='chinh-sach-doi-tra-hang'){
      const faq=table.locator('.support-section__faq').first();
      await faq.locator('summary').click();
      assert.equal(await faq.getAttribute('open'),'','FAQ open '+info.slug);
    }
    const filename='artifacts/support/'+info.slug+'-'+viewport.width+'.png';
    await page.screenshot({path:filename,fullPage:true});
    console.log('SUPPORT_PRODUCTION_PAGE_PASS='+JSON.stringify({slug:info.slug,width:viewport.width,table:info.table,editorRows:await table.locator('[data-esc-source-row]').count(),descriptionLength:description.length}));
   }
   assert.equal(errors.length,0,'JavaScript errors: '+JSON.stringify(errors));
   await page.close();
  }
  console.log('SUPPORT_PRODUCTION_QA_PASS=10 viewports; five WordPress Pages; five ESC Tables; five footer URLs');
 }finally{await browser.close()}
})().catch(e=>{console.error('SUPPORT_PRODUCTION_QA_FAIL='+e.stack);process.exit(1)});
