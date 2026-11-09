'use strict';
/** Read-only verify verified original-media Product cards actually decode after lazy load. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const url='https://aquathanhxuan.io.vn';
const config=JSON.parse(fs.readFileSync('qa-requests/light-card-media.json','utf8'));
const dir='artifacts/light-card-media';
fs.mkdirSync(dir,{recursive:true});
const report={sha:config.sha,checks:[],errors:[],status:'STARTED'};
const save=()=>fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
const samples=[
 {slug:'den-chihiros',id:'83196',name:'Chihiros B90'},
 {slug:'xuanmailong',id:'83183',name:'Xuanmailong WRGB 20'},
 {slug:'odyssea',id:'83166',name:'Odyssea Slim X'},
 {slug:'kaokui',id:'82539',name:'Kaokui 70W Pro'},
];
(async()=>{
 const marker=await fetch(url+'/aquathanhxuan-staging-build.json?qa='+Date.now(),{signal:AbortSignal.timeout(12000)});
 assert.equal(marker.status,200,'Production build marker');
 const actual=await marker.json();
 assert.equal(actual.commit,config.sha,'Wrong production Astro build');
 assert.equal(actual.branch,'master');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [1440,390]){
   const ctx=await browser.newContext({viewport:{width,height:width===390?844:900}});
   const page=await ctx.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   for(const sample of samples){
    const route='/san-pham/'+sample.slug;
    const res=await page.goto(url+route,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(res?.status(),200,'Category page '+route);
    const selector='article[data-catalog-product="'+sample.id+'"] img';
    const image=page.locator(selector).first();
    await image.waitFor({state:'attached',timeout:12000});
    await image.scrollIntoViewIfNeeded({timeout:12000});
    try{
      await page.waitForFunction(sel=>{
        const img=document.querySelector(sel);
        return img instanceof HTMLImageElement && img.complete && img.naturalWidth>0;
      },selector,{timeout:20000,polling:300});
    }catch(e){
      const diag=await image.evaluate(img=>({srcset:img.srcset,currentSrc:img.currentSrc,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
      report.errors.push({name:sample.name,slug:sample.slug,width,diagnostic:diag});
      save();
      throw Error('PRODUCT_CARD_IMAGE_NOT_DECODED '+sample.slug+' '+width+' '+JSON.stringify(diag));
    }
    const imageDetails=await image.evaluate(img=>({currentSrc:img.currentSrc,srcset:img.srcset,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
    assert(imageDetails.currentSrc?.startsWith('https://'),'Missing resolved Product image src '+sample.slug);
    const overflow=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
    assert(overflow<=3,'Horizontal overflow '+route+' '+width);
    const shot=sample.slug+'-'+width+'.png';
    await page.screenshot({path:dir+'/'+shot,fullPage:false});
    report.checks.push({slug:sample.slug,id:sample.id,width,loaded:true,naturalWidth:imageDetails.naturalWidth,currentSrc:imageDetails.currentSrc});
    console.log('LIGHT_CARD_MEDIA_PASS='+JSON.stringify({slug:sample.slug,id:sample.id,width,naturalWidth:imageDetails.naturalWidth}));
    save();
   }
   assert.deepEqual(errors,[],'Browser runtime page errors width='+width);
   await ctx.close();
  }
 }finally{await browser.close()}
 report.status='PASS';report.completed=new Date().toISOString();save();
 console.log('LIGHT_CARD_MEDIA_QA_PASS='+JSON.stringify({sha:config.sha,checks:report.checks.length}));
})().catch(e=>{report.status='FAILED';report.errors.push(String(e.stack||e).slice(0,2400));save();console.error('LIGHT_CARD_MEDIA_QA_FAILED='+String(e.stack||e).slice(0,2400));process.exitCode=1});
