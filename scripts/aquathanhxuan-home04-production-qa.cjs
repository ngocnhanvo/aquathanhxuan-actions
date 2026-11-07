const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = 'https://aquathanhxuan.io.vn';
const wp = 'https://admin.aquathanhxuan.io.vn';
const expected = String(process.env.EXPECTED_ASTRO_SHA || '').trim();
const sizes = [[1440,900],[1024,768],[768,1024],[844,390],[390,844]];
const labels = ['Máy lọc','Đèn'];
const hrefs = ['/san-pham/sunsun-hw-704a-may-loc-ngoai-cho-ho-ca-canh/','/san-pham/den-week-t90-pro/'];
const shortcode = '[table id=home_04 /]';
(async () => {
  assert.match(expected,/^[a-f0-9]{40}$/,'QA requires exact deployed Astro SHA');
  const marker = await fetch(base+'/aquathanhxuan-staging-build.json?home04qa='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
  assert.equal(marker.status,200,'DEPLOY_READY marker HTTP');
  const meta = await marker.json();
  assert.equal(meta.commit,expected,'DEPLOY_READY wrong source SHA');
  console.log('HOME04_DEPLOY_READY=PASS '+expected);
  const dataResponse = await fetch(base+'/data/page-default.json?home04qa='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
  assert.equal(dataResponse.status,200,'CMS page-default JSON missing');
  const page = await dataResponse.json();
  assert.equal((String(page.content||'').match(/\[table id=home_04 \/\]/g)||[]).length,1,'CMS page missing exact shortcode or duplicated');
  const entries=Array.isArray(page.contents)?page.contents:[];
  const ids=entries.map(x=>String(x?.shortcode||''));
  assert.equal(ids.filter(x=>x==='home_04').length,1,'CMS data missing home_04 or duplicate');
  assert(ids.indexOf('home_04')>ids.indexOf('home_03'),'CMS order broken');
  const table=entries.find(x=>x.shortcode==='home_04')?.data;
  assert.equal(table?.id,'home_04','CMS table identity');
  assert.equal(table?.title,'Máy lọc và Đèn','CMS native title');
  assert.deepEqual((table.items||[]).map(x=>x.title),labels,'CMS row names/order');
  assert((table.items||[]).every(x=>x.image&&typeof x.image==='object'&&x.image.src),'CMS processed image missing');
  console.log('HOME04_CMS_CHAIN=PASS '+ids.join(','));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  fs.mkdirSync('artifacts/home04',{recursive:true});
  try {
    for (const [width,height] of sizes) {
      const tab=await browser.newPage({viewport:{width,height}});
      await tab.goto(base+'/?home04qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
      const section=tab.locator('[data-aqua-home-equipment]');
      await section.waitFor({state:'visible',timeout:18000});
      await section.scrollIntoViewIfNeeded();
      const result=await section.evaluate(el=>({
        table:el.dataset.escSourceTable,
        cards:[...el.querySelectorAll('article')].map(card=>({
          title:card.querySelector('h2')?.textContent?.trim(),
          row:card.dataset.escSourceRow,
          href:card.querySelector('a')?.getAttribute('href'),
          linkField:card.querySelector('a')?.dataset.escLinkField,
          image:card.querySelector('img')?.getAttribute('src'),
          alt:card.querySelector('img')?.getAttribute('alt')
        })),
        overflow:document.documentElement.scrollWidth>window.innerWidth+1
      }));
      assert.equal(result.table,'home_04','production table source');
      assert.equal(result.cards.length,2,'production cards count');
      for (let i=0;i<2;i++){
        assert.equal(result.cards[i].title,labels[i],'production product kind '+i);
        assert.equal(result.cards[i].row,String(i),'production original row '+i);
        assert.equal(new URL(result.cards[i].href,base).pathname,hrefs[i],'production CTA '+i);
        assert.equal(result.cards[i].linkField,'button_href','production link edit field '+i);
        assert(result.cards[i].alt,'production image alt missing '+i);
        const img=section.locator('article img').nth(i);
        await img.evaluate(el=>el.decode());
        assert(await img.evaluate(el=>el.complete&&el.naturalWidth>0),'production image broken '+i);
      }
      assert(!result.overflow,'horizontal overflow '+width);
      await section.screenshot({path:'artifacts/home04/'+width+'x'+height+'.png'});
      console.log('HOME04_VIEWPORT=PASS '+width+'x'+height);
      await tab.close();
    }
    assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WordPress Admin credentials missing');
    const admin=await browser.newPage({viewport:{width:1440,height:900}});
    await admin.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
    if(await admin.locator('#user_login').count()){
      await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await admin.locator('#wp-submit').click();
    }
    await admin.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:30000});
    await admin.goto(wp+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',{waitUntil:'domcontentloaded',timeout:60000});
    const frame=admin.frameLocator('#esc-vb-frame');
    const section=frame.locator('[data-aqua-home-equipment]');
    await section.waitFor({state:'visible',timeout:40000});
    const coords=await section.evaluate(el=>({
      table:el.dataset.escSourceTable,version:el.dataset.escRenderedVersion,
      cards:[...el.querySelectorAll('article')].map(c=>({
        row:c.dataset.escSourceRow,editRow:c.dataset.escBuilderRow,
        titleField:c.querySelector('h2')?.dataset.escBuilderCellField,
        titleRow:c.querySelector('h2')?.dataset.escBuilderCellRow,
        imageField:c.querySelector('img')?.dataset.escBuilderImageField,
        imageRow:c.querySelector('img')?.dataset.escBuilderImageRow,
        linkField:c.querySelector('a')?.dataset.escLinkField,
        linkRow:c.querySelector('a')?.dataset.escBuilderCellRow
      }))
    }));
    assert.equal(coords.table,'home_04','Builder table identity');
    assert.match(coords.version||'',/^[a-f0-9]{64}$/,'Builder version missing');
    for (const [i,item] of coords.cards.entries()){
      assert.equal(item.row,String(i),'Builder source row');
      assert.equal(item.editRow,item.row,'Builder edit row');
      assert.equal(item.titleField,'title','Builder title field');
      assert.equal(item.titleRow,item.row,'Builder title row');
      assert.equal(item.imageField,'image','Builder image field');
      assert.equal(item.imageRow,item.row,'Builder image row');
      assert.equal(item.linkField,'button_href','Builder CTA destination field');
      assert.equal(item.linkRow,item.row,'Builder CTA row');
    }
    await section.locator('h2').first().click();
    await admin.waitForFunction(()=>(
      document.querySelector('#esc-vb-section-summary')?.textContent||'').includes('home_04'),null,{timeout:20000});
    const options=await admin.locator('#esc-vb-edit-row option').evaluateAll(els=>els.map(el=>el.value));
    for(const field of ['title','description','button_label','button_href'])
      assert(options.includes(field),'Builder missing edit field '+field);
    await admin.screenshot({path:'artifacts/home04/builder-readonly.png'});
    console.log('HOME04_BUILDER=PASS fields='+options.join(','));
    await admin.close();
    console.log('HOME04_PRODUCTION_QA=PASS');
  } finally {await browser.close();}
})().catch(e=>{console.error('HOME04_PRODUCTION_QA=FAIL '+(e.stack||e.message));process.exitCode=1;});
