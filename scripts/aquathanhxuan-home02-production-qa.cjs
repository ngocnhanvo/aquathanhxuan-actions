const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base='https://aquathanhxuan.io.vn';
const wp='https://admin.aquathanhxuan.io.vn';
const expected='ab5ff3d6e7754b28655677d0e306d0aaabcffb97';
const sizes=[[1440,900],[1024,768],[768,1024],[844,390],[390,844]];
(async()=>{
  const marker=await fetch(base+'/aquathanhxuan-staging-build.json?home02qa='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
  assert.equal(marker.status,200,'DEPLOY_READY: staging marker HTTP');
  const meta=await marker.json();
  assert.equal(meta.commit,expected,'DEPLOY_READY: source SHA mismatch');
  console.log('HOME02_DEPLOY_READY=PASS '+expected);
  const dataResponse=await fetch(base+'/data/page-default.json?home02qa='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
  assert.equal(dataResponse.status,200,'Homepage data HTTP');
  const pageData=await dataResponse.json();
  assert(String(pageData.content||'').includes('home_02'),'Homepage page content lacks home_02');
  const ids=(Array.isArray(pageData.contents)?pageData.contents:[]).map(v=>String(v?.shortcode||''));
  assert(ids.includes('home_02'),'Homepage processed data lacks home_02');
  console.log('HOME02_CMS_CHAIN=PASS shortcodes='+ids.join(','));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  fs.mkdirSync('artifacts/home02',{recursive:true});
  try{
    for(const [width,height] of sizes){
      const page=await browser.newPage({viewport:{width,height}});
      await page.goto(base+'/?home02qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
      const section=page.locator('[data-aqua-home-substrate]');
      await section.waitFor({state:'visible',timeout:25000});
      await section.scrollIntoViewIfNeeded();
      const photo=section.locator('img[data-esc-source-field="image"]');
      await photo.waitFor({state:'visible',timeout:10000});
      await page.waitForFunction(()=>{const el=document.querySelector('[data-aqua-home-substrate] img[data-esc-source-field="image"]');return !!el&&el.complete&&el.naturalWidth>0},{},{timeout:16000});
      const state=await section.evaluate(el=>({heading:el.querySelector('h2')?.textContent?.trim(),row:el.dataset.escSourceRow,table:el.dataset.escSourceTable,version:el.dataset.escRenderedVersion,image:el.querySelector('img')?.getAttribute('alt'),scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth}));
      assert(state.heading,'Home02 heading empty');
      assert.equal(state.table,'home_02','Home02 source identity');
      assert(/^\d+$/.test(state.row),'Home02 original row missing');
      assert(state.image,'Home02 SEO alt missing');
      assert(state.scrollWidth<=state.viewport+1,'Horizontal page overflow '+width);
      await section.screenshot({path:'artifacts/home02/'+width+'x'+height+'.png'});
      console.log('HOME02_QA_VIEWPORT=PASS '+width+'x'+height+' row='+state.row+' title='+state.heading+' versionPresent='+Boolean(state.version));
      await page.close();
    }
    // Builder inspection is read-only: do not touch/save any ESC Table cell.
    assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WP Admin secrets unavailable');
    const admin=await browser.newPage({viewport:{width:1440,height:900}});
    await admin.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded'});
    if(await admin.locator('#user_login').count()){
      await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await admin.locator('#wp-submit').click();
    }
    await admin.waitForURL(u=>u.pathname.includes('wp-admin'),{timeout:25000});
    await admin.goto(wp+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',{waitUntil:'domcontentloaded',timeout:35000});
    const frame=admin.frameLocator('#esc-vb-frame');
    const section=frame.locator('[data-aqua-home-substrate]');
    await section.waitFor({state:'visible',timeout:35000});
    console.log('HOME02_BUILDER_PREVIEW=PASS page=82454');
    const title=section.locator('h2');
    await title.click();
    const summary=await admin.locator('#esc-vb-section-summary').innerText({timeout:15000});
    console.log('HOME02_BUILDER_SECTION='+JSON.stringify(summary.slice(0,300)));
    const inspector=await admin.locator('#esc-vb-inspector').innerText();
    assert(/home_02/.test(inspector+' '+summary),'Builder selection lost table ID');
    await admin.screenshot({path:'artifacts/home02/builder-readonly.png'});
    console.log('HOME02_BUILDER_SELECTION=PASS read_only=true');
    await admin.close();
    console.log('HOME02_PRODUCTION_QA=PASS');
  } finally {await browser.close();}
})().catch(e=>{console.error('HOME02_PRODUCTION_QA=FAIL '+(e.stack||e.message));process.exitCode=1;});
