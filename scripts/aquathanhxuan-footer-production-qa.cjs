const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const frontend='https://aquathanhxuan.io.vn';
const wordpress='https://admin.aquathanhxuan.io.vn';
const expected='a88d3981e01911a958fc904a29f49b67df15f2f3';
const sizes=[[1440,900],[1024,768],[768,1024],[844,390],[390,844]];
(async()=>{
  const markerResp=await fetch(frontend+'/aquathanhxuan-staging-build.json?footerqa='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
  assert.equal(markerResp.status,200,'Footer production marker missing');
  const marker=await markerResp.json();
  assert.equal(marker.commit,expected,'Footer deployment SHA mismatch');
  console.log('FOOTER_DEPLOY_READY=PASS '+expected);
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  fs.mkdirSync('artifacts/footer',{recursive:true});
  try{
    for(const [width,height] of sizes){
      const page=await browser.newPage({viewport:{width,height}});
      await page.goto(frontend+'/?footerqa='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
      const footer=page.locator('#footer-contact');
      await footer.waitFor({state:'visible',timeout:18000});
      await footer.scrollIntoViewIfNeeded();
      const logo=footer.locator('section[aria-labelledby="footer-company-title"] img').first();
      await logo.waitFor({state:'visible',timeout:10000});
      await logo.evaluate(img=>img.decode());
      const brandSrc=await logo.getAttribute('src');
      const headerLogo=page.locator('#header-brandbar img').first();
      const headerSrc=await headerLogo.getAttribute('src');
      assert(brandSrc && headerSrc,'Footer/Header official WordPress logo missing');
      assert.equal(new URL(brandSrc,frontend).href,new URL(headerSrc,frontend).href,
        'Footer logo must match Header CMS logo, never use a local mockup');
      const support=footer.locator('section[aria-labelledby="footer-policy-title"]');
      await support.waitFor({state:'visible',timeout:10000});
      const supportLinks=await support.locator('a').evaluateAll(nodes=>nodes.map(a=>({
        label:a.textContent.trim(),href:a.getAttribute('href')
      })));
      assert(supportLinks.length>=2,'Footer support column is empty despite real CMS contact data');
      assert(supportLinks.some(link=>/^tel:/.test(link.href||'')),
        'Footer support: canonical WordPress phone link missing');
      assert(supportLinks.every(link=>link.href&&link.href!=='#'),
        'Footer support: link without WordPress source');
      console.log('FOOTER_SUPPORT=PASS '+JSON.stringify(supportLinks));
      const categories=footer.locator('section[aria-labelledby="footer-category-title"] a');
      const links=await categories.evaluateAll(nodes=>nodes.map(a=>({
        text:a.textContent.trim(),href:a.getAttribute('href')
      })));
      assert(links.length>=3,'Footer categories missing native WordPress menu links');
      assert(links.every(x=>x.text&&x.href&&x.href!=='#'&&!x.href.startsWith('javascript:')),
        'Footer category label or URL is invalid');
      const wave=await footer.locator('svg[viewBox="0 0 1440 48"]').evaluate(svg=>(
        [...svg.querySelectorAll('path')].map(x=>x.getAttribute('fill'))));
      assert.deepEqual(wave,['#1BB4DF','#332B8E'],'Footer: approved cyan-purple wave missing');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
      assert(!overflow,'Footer: horizontal overflow '+width+'x'+height);
      await footer.screenshot({path:'artifacts/footer/'+width+'x'+height+'.png'});
      console.log('FOOTER_VIEWPORT=PASS '+width+'x'+height+' '+JSON.stringify({
        categoryCount:links.length,logo:brandSrc
      }));
      await page.close();
    }

    assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Builder QA secrets unavailable');
    const admin=await browser.newPage({viewport:{width:1440,height:900}});
    await admin.goto(wordpress+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
    if(await admin.locator('#user_login').count()){
      await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await admin.locator('#wp-submit').click();
    }
    await admin.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:30000});
    await admin.goto(wordpress+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',
      {waitUntil:'domcontentloaded',timeout:60000});
    const footer=admin.frameLocator('#esc-vb-frame').locator('#footer-contact');
    await footer.waitFor({state:'visible',timeout:45000});
    const fields=await footer.locator('[data-esc-vb-footer-field]').evaluateAll(nodes=>
      nodes.map(el=>el.getAttribute('data-esc-vb-footer-field')).filter(Boolean));
    assert(fields.includes('tencongty'),'Builder: official company name not editable');
    assert(fields.some(name=>['diachihcm','diachihanoi','sodienthoaihcm','hotline'].includes(name)),
      'Builder: WordPress contact fields lost');
    const menuCount=await footer.locator('[data-esc-vb-menu-item-id]').count();
    assert(menuCount>0,'Builder: WordPress category menu item identities lost');
    await admin.screenshot({path:'artifacts/footer/builder-readonly.png'});
    console.log('FOOTER_BUILDER=PASS '+JSON.stringify({fields,menuCount}));
    await admin.close();
    console.log('FOOTER_PRODUCTION_QA=PASS');
  }finally{await browser.close();}
})().catch(e=>{console.error('FOOTER_PRODUCTION_QA=FAIL '+(e.stack||e.message));process.exitCode=1;});
