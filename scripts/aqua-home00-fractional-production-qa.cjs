'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const output='artifacts/home00-fractional-qa';
fs.mkdirSync(output,{recursive:true});
const {chromium}=require('playwright');
const expectedSha='b208b9f82c669953ec6685e740f539ee4c21e046';
const origin='https://aquathanhxuan.io.vn';

(async()=>{
  const markerResponse=await fetch(origin+'/aquathanhxuan-staging-build.json?hero_breakpoint_qa='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
  assert.equal(markerResponse.status,200,'Production marker unavailable');
  const marker=await markerResponse.json();
  assert.equal(marker.commit,expectedSha,'Production deploy has not published the fixed source');
  console.log('HERO_PRODUCTION_SOURCE_PASS='+marker.commit);

  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    for(const [width,height] of [[390,844],[767,760],[768,760],[1024,768],[1440,900]]){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2});
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
      try{
        await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:60000});
        const hero=page.locator('[data-aqua-home-hero]');
        await hero.waitFor({state:'visible',timeout:25000});
        await page.waitForFunction(()=>document.querySelector('[data-aqua-home-hero]')?.dataset.heroReady==='true',null,{timeout:15000});
        const active=hero.locator('[data-home-slide][data-active="true"]');
        assert.equal(await active.count(),1,'Exactly one visible slide required');
        const image=active.locator('img').first();
        await image.evaluate(img=>img.decode());
        const data=await page.evaluate(()=>{
          const root=document.querySelector('[data-aqua-home-hero]');
          const slide=root.querySelector('[data-active="true"]');
          const img=slide?.querySelector('img');
          return {eligible:root.dataset.eligibleCount,audience:slide?.dataset.audience,src:img?.currentSrc,width:img?.naturalWidth,height:root.querySelector('.aqua-hero__viewport')?.getBoundingClientRect()?.height,mediaMobile:matchMedia('(max-width: 767px)').matches,dotsVisible:getComputedStyle(root.querySelector('[data-hero-dots]')).display,arrowsVisible:getComputedStyle(root.querySelector('[data-hero-next]')).display};
        });
        const mobile=width<=767;
        assert.equal(data.audience,mobile?'mobile':'desktop','Wrong slide audience at '+width);
        assert.equal(data.eligible,mobile?'1':'2','Wrong slide count at '+width);
        assert(data.width>10 && !data.src.startsWith('data:'),'Actual banner image missing at '+width);
        if(mobile){
          assert(data.src.includes('mobile-hero'),'Wrong mobile banner at '+width);
          assert.equal(data.dotsVisible,'none','Mobile should not display desktop dots');
          assert.equal(data.arrowsVisible,'none','Mobile should not display desktop arrows');
        }else{
          assert(data.src.includes('cropped-banner'),'Wrong desktop banner at '+width);
        }
        assert.deepEqual(errors,[],'Unexpected page script exception at '+width);
        await hero.screenshot({path:output+'/hero-'+width+'x'+height+'.png'});
        console.log('HERO_PRODUCTION_VIEWPORT_PASS='+JSON.stringify({viewport:width+'x'+height,...data}));
      }finally{await page.close()}
    }

    const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:2});
    try{
      await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:60000});
      await page.evaluate(()=>{
        const f=document.createElement('iframe');
        f.dataset.heroFractionalQa='true';
        f.style.width='767.5px';f.style.height='760px';f.style.border='none';
        f.src='/';document.body.append(f);
      });
      const frame=page.frameLocator('iframe[data-hero-fractional-qa]');
      await frame.locator('[data-aqua-home-hero]').waitFor({state:'visible',timeout:25000});
      const value=await frame.locator('[data-aqua-home-hero]').evaluate(async root=>{
        for(let i=0;i<100&&root.dataset.heroReady!=='true';i++)await new Promise(r=>setTimeout(r,70));
        const selected=root.querySelector('[data-hero-slide][data-active="true"]');
        const img=selected.querySelector('img');
        await img.decode();
        return {layoutWidth:innerWidth,visualWidth:visualViewport.width,mobileMedia:matchMedia('(max-width: 767px)').matches,
          previousDesktopMedia:matchMedia('(min-width: 768px)').matches,
          patchedDesktopMedia:matchMedia('not all and (max-width: 767px)').matches,
          audience:selected.dataset.audience,image:img.currentSrc,naturalWidth:img.naturalWidth};
      });
      assert.equal(value.patchedDesktopMedia,!value.mobileMedia,'Inverse media condition must cover every viewport');
      assert(value.naturalWidth>10&&!value.image.startsWith('data:'),'Fractional width cannot show transparent pixel');
      await frame.locator('[data-aqua-home-hero]').screenshot({path:output+'/hero-767.5x760.png'});
      console.log('HERO_FRACTIONAL_VIEWPORT_PASS='+JSON.stringify(value));
    }finally{await page.close()}
    console.log('HOME00_FRACTIONAL_PRODUCTION_QA=PASS');
  } finally { await browser.close() }
})().catch(e=>{console.error('HOME00_FRACTIONAL_PRODUCTION_QA=FAIL '+String(e.stack||e));process.exitCode=1});
