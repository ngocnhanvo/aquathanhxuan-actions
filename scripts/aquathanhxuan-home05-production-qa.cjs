const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
const base='https://aquathanhxuan.io.vn';
const wp='https://admin.aquathanhxuan.io.vn';
const expectedSha='df042317f33344afbc48f2495949af4ccf9a27f6';
const names=['Sản phẩm','Giao hàng','Hỗ trợ','Bảo hành'];
const viewports=[[1440,900],[1024,768],[768,1024],[844,390],[390,844]];

(async()=>{
  const markerResponse=await fetch(base+'/aquathanhxuan-staging-build.json?home05qa='+Date.now(),{
    headers:{'Cache-Control':'no-cache'}});
  assert.equal(markerResponse.status,200,'DEPLOY_READY: marker missing');
  const marker=await markerResponse.json();
  assert.equal(marker.commit,expectedSha,'DEPLOY_READY: wrong Astro revision');
  console.log('HOME05_DEPLOY_READY=PASS '+expectedSha);

  const jsonResponse=await fetch(base+'/data/page-default.json?home05qa='+Date.now(),{
    headers:{'Cache-Control':'no-cache'}});
  assert.equal(jsonResponse.status,200,'CMS_CHAIN: data file missing');
  const pageData=await jsonResponse.json();
  const contents=Array.isArray(pageData.contents)?pageData.contents:[];
  const ids=contents.map(x=>String(x?.shortcode||''));
  assert.equal(ids.filter(x=>x==='home_05').length,1,'CMS_CHAIN: Home05 absent or duplicated');
  assert(ids.indexOf('home_05')>ids.indexOf('home_04'),'CMS_CHAIN: benefits not after equipment');
  const source=contents.find(x=>x.shortcode==='home_05')?.data;
  assert.equal(source?.id,'home_05','CMS_CHAIN: wrong source ID');
  assert.equal(source?.title,'Lợi ích khách hàng','CMS_CHAIN: table name mismatch');
  assert.deepEqual((source.items||[]).map(x=>x.title),names,'CMS_CHAIN: benefits content mismatch');
  console.log('HOME05_CMS_CHAIN=PASS '+ids.join(','));

  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  fs.mkdirSync('artifacts/home05',{recursive:true});
  try{
    for(const [width,height] of viewports){
      const page=await browser.newPage({viewport:{width,height}});
      await page.goto(base+'/?home05qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
      const section=page.locator('[data-aqua-home-benefits]');
      await section.waitFor({state:'visible',timeout:20000});
      await section.scrollIntoViewIfNeeded();
      const actual=await section.evaluate(el=>({
        table:el.dataset.escSourceTable,
        version:el.dataset.escRenderedVersion,
        headings:[...el.querySelectorAll('h3')].map(node=>node.textContent.trim()),
        rows:[...el.querySelectorAll('article')].map(node=>node.dataset.escSourceRow),
        icons:el.querySelectorAll('[data-esc-source-field="lucide-icon"] svg').length,
        overflow:document.documentElement.scrollWidth>window.innerWidth+1
      }));
      assert.equal(actual.table,'home_05','QA: source table');
      assert.deepEqual(actual.headings,names,'QA: native feature headings');
      assert.deepEqual(actual.rows,['0','1','2','3'],'QA: source row identity');
      assert.equal(actual.icons,4,'QA: four valid CMS Lucide icons required');
      assert(!actual.overflow,'QA: horizontal overflow '+width+'x'+height);
      await section.screenshot({path:'artifacts/home05/'+width+'x'+height+'.png'});
      console.log('HOME05_VIEWPORT=PASS '+width+'x'+height);
      await page.close();
    }

    assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,
      'QA: WordPress secrets unavailable');
    const admin=await browser.newPage({viewport:{width:1440,height:900}});
    await admin.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
    if(await admin.locator('#user_login').count()){
      await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await admin.locator('#wp-submit').click();
    }
    await admin.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:30000});
    await admin.goto(wp+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',
      {waitUntil:'domcontentloaded',timeout:60000});
    const section=admin.frameLocator('#esc-vb-frame').locator('[data-aqua-home-benefits]');
    await section.waitFor({state:'visible',timeout:45000});
    const coords=await section.evaluate(el=>({
      table:el.dataset.escSourceTable,version:el.dataset.escRenderedVersion,
      rows:[...el.querySelectorAll('article')].map(a=>({
        source:a.dataset.escSourceRow,builder:a.dataset.escBuilderRow,
        title:a.querySelector('h3')?.dataset.escBuilderCellField,
        description:a.querySelector('p')?.dataset.escBuilderCellField,
        icon:a.querySelector('[data-esc-source-field="lucide-icon"]')?.dataset.escBuilderCellField
      }))
    }));
    assert.equal(coords.table,'home_05','Builder: table identity');
    assert.match(coords.version||'',/^[a-f0-9]{64}$/,'Builder: source version missing');
    assert.deepEqual(coords.rows.map(v=>v.source),['0','1','2','3'],'Builder: source rows');
    assert(coords.rows.every(v=>v.builder===v.source&&v.title==='title'&&v.icon==='lucide-icon'),
      'Builder: native row/field mapping');
    console.log('HOME05_BUILDER_COORDS=PASS '+JSON.stringify(coords));

    await section.locator('h3').first().click();
    await admin.waitForFunction(()=>(
      (document.querySelector('#esc-vb-edit-caption')?.textContent||'').includes('home_05')
      && Boolean(document.querySelector('#esc-vb-edit-row option[value="3:title"]'))
    ),null,{timeout:30000});
    const options=await admin.locator('#esc-vb-edit-row option').evaluateAll(els=>els.map(el=>el.value));
    console.log('HOME05_BUILDER_OPTIONS='+JSON.stringify(options));
    for(const field of ['title','description','lucide-icon'])
      for(const row of [0,1,2,3])
        assert(options.includes(row+':'+field),'Builder: missing native row/field '+row+':'+field);
    assert.equal(await admin.locator('#esc-vb-edit-title').isDisabled(),false,
      'Builder: native text input disabled');
    await admin.screenshot({path:'artifacts/home05/builder-readonly.png'});
    await admin.close();
    console.log('HOME05_BUILDER=PASS');
    console.log('HOME05_PRODUCTION_QA=PASS');
  }finally{await browser.close();}
})().catch(e=>{console.error('HOME05_PRODUCTION_QA=FAIL '+(e.stack||e.message));process.exitCode=1;});
