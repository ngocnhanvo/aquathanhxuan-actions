const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const site='https://aquathanhxuan.io.vn';
const wp='https://admin.aquathanhxuan.io.vn';
const expectedSha='1a835b579a239ea6dc87ce4cf02018c4ec62c4c9';
const widths=[[1440,900],[1024,768],[768,1024],[844,390],[390,844],[320,700]];
const output='artifacts/home00-mobile-production';
fs.mkdirSync(output,{recursive:true});
const expectedDesktop=['cropped-banner-8-1.png','cropped-banner-6.png'];
(async()=>{
 const markerResponse=await fetch(site+'/aquathanhxuan-staging-build.json?mobile_hero='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
 assert.equal(markerResponse.status,200,'Missing production source marker');
 const marker=await markerResponse.json();
 assert.equal(marker.commit,expectedSha,'Production source mismatch');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of widths){
   const page=await browser.newPage({viewport:{width,height}});
   await page.goto(site+'/?mobilehero='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
   const hero=page.locator('[data-aqua-home-hero]');
   await hero.waitFor({state:'visible',timeout:20000});
   assert.equal(await hero.getAttribute('data-has-mobile-slide'),'true','Mobile slide missing');
   const slides=hero.locator('[data-home-slide]');
   assert.equal(await slides.count(),3,'Home00 must have two desktop slides and one mobile slide');
   assert.deepEqual(await slides.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-audience'))),['desktop','desktop','mobile']);
   const isMobile=width<=767;
   await page.waitForFunction(mobile=>{
    const root=document.querySelector('[data-aqua-home-hero]');
    return root?.getAttribute('data-eligible-count')===(mobile?'1':'2');
   },isMobile,{timeout:12000});
   const active=hero.locator('[data-home-slide][data-active="true"]');
   assert.equal(await active.count(),1,'Exactly one active slide expected');
   const activeAudience=await active.getAttribute('data-audience');
   assert.equal(activeAudience,isMobile?'mobile':'desktop','Wrong desktop/mobile slide selected');
   const currentImg=active.locator('.aqua-hero__media img').first();
   await currentImg.evaluate(img=>img.decode());
   assert(await currentImg.evaluate(img=>img.complete&&img.naturalWidth>0),'Hero image broken');
   const fit=await currentImg.evaluate(img=>getComputedStyle(img).objectFit);
   const src=await currentImg.getAttribute('src');
   if(isMobile){
    assert.equal(fit,'contain','Portrait banner must not be cropped');
    const href=await active.locator('.aqua-hero__mobile-cta-link').getAttribute('href');
    assert.equal(new URL(href,site).pathname,'/san-pham','Mobile CTA has wrong target');
    assert.equal(await hero.locator('[data-hero-dot]:visible').count(),0,'One mobile slide should hide dot picker');
    assert.equal(await hero.locator('[data-hero-next]:visible').count(),0,'One mobile slide should hide redundant arrow');
    assert(src&&!expectedDesktop.some(name=>src.includes(name)),'Mobile is displaying desktop image');
    const rect=await currentImg.boundingBox();
    assert(rect&&rect.height>=width*1.15,'Portrait image should keep its aspect ratio');
    console.log('HOME00_MOBILE_VIEWPORT_PASS='+width+'x'+height+' '+src);
   } else {
    assert(expectedDesktop.some(name=>src.includes(name)),'Desktop image changed');
    const button=hero.locator('[data-hero-next]');
    await button.click();
    const second=slides.nth(1);
    assert.equal(await second.getAttribute('data-active'),'true','Desktop second banner switching failed');
    const secondImgSrc=await second.locator('img').getAttribute('src');
    assert(secondImgSrc&&secondImgSrc.includes(expectedDesktop[1]),'Desktop second original image changed');
    console.log('HOME00_DESKTOP_VIEWPORT_PASS='+width+'x'+height);
   }
   const docWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert(docWidth<=width+1,'Horizontal overflow '+width);
   await hero.screenshot({path:output+'/hero-'+width+'x'+height+'.png'});
   await page.close();
  }
  if(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD){
   const admin=await browser.newPage({viewport:{width:1440,height:900}});
   await admin.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
   if(await admin.locator('#user_login').count()){
    await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
    await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
    await admin.locator('#wp-submit').click();
   }
   await admin.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
   await admin.goto(wp+'/wp-admin/admin.php?page=tablepress&action=edit&table_id=home_00',{waitUntil:'domcontentloaded',timeout:60000});
   await admin.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:25000});
   const rows=await admin.evaluate(()=>window.tp.editor.getData());
   assert.equal(rows.length,5,'Native Home00 row count mismatch');
   const imageCol=rows[0].indexOf('image'),mobileCol=rows[0].indexOf('mobile');
   assert(imageCol>=0&&mobileCol>=0);
   assert.deepEqual(rows.slice(2).map(r=>r[mobileCol]),['0','0','1']);
   for(let i=0;i<2;i++)assert(rows[i+2][imageCol].includes(expectedDesktop[i]),'Desktop source cell changed');
   assert(rows[4][imageCol].includes('aqua-thanh-xuan-mobile-hero.webp'),'Mobile source cell missing');
   assert.equal(rows[4][imageCol].split('<img ').length-1,1,'Mobile source must contain one img');
   assert(rows[4][imageCol].includes('alt='),'Mobile source alt missing');
   assert.equal(rows[4][rows[0].indexOf('show_text')],'0','Mobile image overlay text must be off');
   console.log('HOME00_NATIVE_CMS_READBACK_PASS=desktop:2,mobile:1,row:2');
   const resp=await admin.request.get(wp+'/wp-json/wp/v2/media/82696?context=edit');
   assert.equal(resp.status(),200,'Mobile asset not in Media Library');
   const media=await resp.json();
   assert(media.source_url?.includes('aqua-thanh-xuan-mobile-hero.webp'),'Media URL mismatch');
   assert(String(media.alt_text||'').length>12,'Mobile ALT missing');
   console.log('HOME00_MOBILE_MEDIA_PASS='+media.id);
   await admin.close();
  }
  console.log('HOME00_MOBILE_PRODUCTION_QA=PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error('HOME00_MOBILE_PRODUCTION_QA=FAIL '+(e.stack||e));process.exitCode=1;});
