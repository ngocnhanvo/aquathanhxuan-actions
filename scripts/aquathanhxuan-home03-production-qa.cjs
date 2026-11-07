const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = 'https://aquathanhxuan.io.vn';
const wp = 'https://admin.aquathanhxuan.io.vn';
const expected = 'd9b42a6dbc68bc4fd68be442afe3f5645f834dc6';
const sizes = [[1440,900],[1024,768],[768,1024],[844,390],[390,844]];
const shortcode = '[table id=home_03 /]';
(async () => {
  const marker = await fetch(base+'/aquathanhxuan-staging-build.json?home03qa='+Date.now(), {headers:{'Cache-Control':'no-cache'}});
  assert.equal(marker.status, 200, 'DEPLOY_READY: production marker HTTP status');
  const metadata = await marker.json();
  assert.equal(metadata.commit, expected, 'DEPLOY_READY: Astro source revision mismatch');
  console.log('HOME03_DEPLOY_READY=PASS '+expected);
  const resp = await fetch(base+'/data/page-default.json?home03qa='+Date.now(), {headers:{'Cache-Control':'no-cache'}});
  assert.equal(resp.status, 200, 'CMS_CHAIN: homepage data missing');
  const pageData = await resp.json();
  assert(String(pageData.content||'').includes(shortcode), 'CMS_CHAIN: shortcode absent in page content');
  const ids = (Array.isArray(pageData.contents) ? pageData.contents : []).map(x=>String(x?.shortcode||''));
  assert.equal(ids.filter(id=>id==='home_03').length, 1, 'CMS_CHAIN: home_03 not processed exactly once');
  assert(ids.indexOf('home_03')>ids.indexOf('home_02'), 'CMS_CHAIN: home_03 before home_02');
  console.log('HOME03_CMS_CHAIN=PASS '+ids.join(','));
  const entry=(Array.isArray(pageData.contents)?pageData.contents:[]).find(x=>String(x?.shortcode||'')==='home_03');
  const table=entry?.data;
  console.log('HOME03_DATA_DIAGNOSTIC='+JSON.stringify({
    tableId:table?.id, name:table?.name, type:typeof table,
    keys:table&&typeof table==='object'?Object.keys(table).slice(0,15):[],
    itemsLength:Array.isArray(table?.items)?table.items.length:null,
    first:table?.items?.[0]?{
      keys:Object.keys(table.items[0]),
      title:table.items[0].title, imageType:typeof table.items[0].image,
      imageKeys:table.items[0].image&&typeof table.items[0].image==='object'?Object.keys(table.items[0].image):[],
      imageSrc:table.items[0].image?.src, link:table.items[0].button_href
    }:null
  }));
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  fs.mkdirSync('artifacts/home03',{recursive:true});
  try {
    for (const [width,height] of sizes) {
      const page = await browser.newPage({viewport:{width,height}});
      await page.goto(base+'/?home03qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
      const diagnostic=await page.evaluate(()=>({
        wrappers:[...document.querySelectorAll('[data-tablepress-preview]')].map(el=>({id:el.getAttribute('data-tablepress-preview'),childCount:el.children.length,htmlLength:el.innerHTML.length})),
        comboCount:document.querySelectorAll('[data-aqua-home-combo]').length,
        commentSnippet:document.body.innerText.includes('Combo bể cubic 40 siêu trong'),
        title:document.title
      }));
      console.log('HOME03_DOM_DIAGNOSTIC='+JSON.stringify(diagnostic));
      const section=page.locator('[data-aqua-home-combo]');
      await section.waitFor({state:'visible',timeout:30000});
      await section.scrollIntoViewIfNeeded();
      const item=section.locator('.aqua-hot-combo__item').first();
      const image=item.locator('img[data-esc-source-field="image"]');
      await image.waitFor({state:'visible',timeout:12000});
      await image.evaluate(el => el.decode());
      const state=await section.evaluate(el=>{
        const article=el.querySelector('.aqua-hot-combo__item');
        const link=article?.querySelector('a[data-esc-link-field="button_href"]');
        const image=article?.querySelector('img');
        return {title:el.querySelector('h2')?.textContent?.trim(),product:article?.querySelector('h3')?.textContent?.trim(),
          table:el.dataset.escSourceTable,sourceRow:article?.dataset.escSourceRow,
          href:link?.getAttribute('href'),label:link?.textContent?.trim(),
          imageAlt:image?.getAttribute('alt'),imageSrc:image?.getAttribute('src'),
          loaded:image?.complete&&image?.naturalWidth>0,
          items:el.querySelectorAll('.aqua-hot-combo__item').length,
          overflow:document.documentElement.scrollWidth > window.innerWidth+1};
      });
      assert.equal(state.table,'home_03','QA: source table mismatch');
      assert.equal(state.title,'Hot combo','QA: section name mismatch');
      assert.equal(state.product,'Combo bể cubic 40 siêu trong','QA: real product name mismatch');
      assert.equal(state.items,1,'QA: unexpected combo item count');
      assert.equal(state.sourceRow,'0','QA: ESC original row drift');
      assert.equal(state.label,'Xem combo','QA: CTA label');
      assert.equal(new URL(state.href,base).pathname,'/san-pham/combo-be-cubic-40-sieu-trong/','QA: CTA URL');
      assert(state.loaded && state.imageAlt,'QA: image broken or alt absent');
      assert(!state.overflow,'QA: horizontal overflow at '+width);
      // Home 04 is a separate native ESC Table with two verified equipment cards.
      const equipment=page.locator('[data-aqua-home-equipment]');
      await equipment.waitFor({state:'visible',timeout:12000});
      await equipment.scrollIntoViewIfNeeded();
      await equipment.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
      const cards=await equipment.locator('article').evaluateAll(els=>els.map(el=>{
        const link=el.querySelector('a[data-esc-link-field="button_href"]');
        const img=el.querySelector('img[data-esc-source-field="image"]');
        return {row:el.dataset.escSourceRow,title:el.querySelector('h2')?.textContent?.trim(),
          href:link?.getAttribute('href'),label:link?.textContent?.trim(),
          src:img?.getAttribute('src'),alt:img?.getAttribute('alt'),
          loaded:Boolean(img?.complete&&img?.naturalWidth>0)};
      }));
      assert.equal(await equipment.getAttribute('data-esc-source-table'),'home_04','Home04: source table');
      assert.equal(cards.length,2,'Home04: two real equipment cards expected');
      assert.deepEqual(cards.map(c=>c.title),['Máy lọc','Đèn'],'Home04: product categories/order');
      assert.deepEqual(cards.map(c=>c.row),['0','1'],'Home04: original row indices');
      assert(cards.every(c=>c.label==='Xem sản phẩm'),'Home04: CTA labels');
      assert.deepEqual(cards.map(c=>new URL(c.href,base).pathname),[
        '/san-pham/sunsun-hw-704a-may-loc-ngoai-cho-ho-ca-canh/',
        '/san-pham/den-week-t90-pro/'
      ],'Home04: WooCommerce product links');
      assert(cards.every(c=>c.loaded&&c.alt),'Home04: images loaded with SEO alt');
      assert(!await equipment.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),
        'Home04: horizontal overflow at '+width);
      await equipment.screenshot({path:'artifacts/home03/equipment-'+width+'x'+height+'.png'});
      console.log('HOME04_QA_VIEWPORT=PASS '+width+'x'+height);
      await section.screenshot({path:'artifacts/home03/'+width+'x'+height+'.png'});
      console.log('HOME03_QA_VIEWPORT=PASS '+width+'x'+height);
      await page.close();
    }
    assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'QA: WordPress admin secrets unavailable');
    const admin=await browser.newPage({viewport:{width:1440,height:900}});
    await admin.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
    if(await admin.locator('#user_login').count()){
      await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await admin.locator('#wp-submit').click();
    }
    await admin.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:30000});
    await admin.goto(wp+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',{waitUntil:'domcontentloaded',timeout:60000});
    const section=admin.frameLocator('#esc-vb-frame').locator('[data-aqua-home-combo]');
    await section.waitFor({state:'visible',timeout:40000});
    const coords=await section.evaluate(el=>{
      const article=el.querySelector('.aqua-hot-combo__item');
      const title=article?.querySelector('h3');
      const link=article?.querySelector('a');
      const image=article?.querySelector('img');
      return {table:el.dataset.escSourceTable,version:el.dataset.escRenderedVersion,
        row:article?.dataset.escSourceRow,editRow:article?.dataset.escBuilderRow,
        titleRow:title?.dataset.escBuilderCellRow,titleField:title?.dataset.escBuilderCellField,
        linkField:link?.dataset.escLinkField,linkRow:link?.dataset.escBuilderCellRow,
        imageField:image?.dataset.escBuilderImageField,imageRow:image?.dataset.escBuilderImageRow};
    });
    assert.equal(coords.table,'home_03','Builder: table identity');
    assert.match(coords.version||'',/^[a-f0-9]{64}$/,'Builder: source revision missing');
    assert.equal(coords.row,'0','Builder: original source row');
    assert.equal(coords.editRow,coords.row,'Builder: row identity drift');
    assert.equal(coords.titleRow,coords.row,'Builder: title row mapping');
    assert.equal(coords.titleField,'title','Builder: title field mapping');
    assert.equal(coords.linkField,'button_href','Builder: CTA destination field');
    assert.equal(coords.linkRow,coords.row,'Builder: CTA row mapping');
    assert.equal(coords.imageField,'image','Builder: image mapping');
    assert.equal(coords.imageRow,coords.row,'Builder: image row mapping');
    console.log('HOME03_BUILDER_COORDS=PASS '+JSON.stringify(coords));
    await section.locator('h3').first().click();
    await admin.waitForFunction(()=>(
      document.querySelector('#esc-vb-section-summary')?.textContent||'').includes('home_03'),null,{timeout:18000});
    const options=await admin.locator('#esc-vb-edit-row option').evaluateAll(els=>els.map(el=>el.value));
    for(const field of ['title','description','button_label','button_href'])
      assert(options.includes(field),'Builder: missing field '+field);
    assert.equal(await admin.locator('#esc-vb-edit-title').isDisabled(),false,'Builder: title editor disabled');
    const equipmentBuilder=admin.frameLocator('#esc-vb-frame').locator('[data-aqua-home-equipment]');
    await equipmentBuilder.waitFor({state:'visible',timeout:30000});
    const equipmentCoords=await equipmentBuilder.evaluate(el=>({
      table:el.dataset.escSourceTable,version:el.dataset.escRenderedVersion,
      rows:[...el.querySelectorAll('article')].map(article=>({
        row:article.dataset.escSourceRow,editRow:article.dataset.escBuilderRow,
        titleField:article.querySelector('h2')?.dataset.escBuilderCellField,
        linkField:article.querySelector('a')?.dataset.escLinkField,
        imageField:article.querySelector('img')?.dataset.escBuilderImageField
      }))
    }));
    assert.equal(equipmentCoords.table,'home_04','Home04 Builder: table identity');
    assert.match(equipmentCoords.version||'',/^[a-f0-9]{64}$/,'Home04 Builder: version missing');
    assert.deepEqual(equipmentCoords.rows.map(row=>row.row),['0','1'],'Home04 Builder: source rows');
    assert(equipmentCoords.rows.every(row=>row.editRow===row.row && row.titleField==='title'
      && row.linkField==='button_href' && row.imageField==='image'),'Home04 Builder: cell identities');
    console.log('HOME04_BUILDER_COORDS=PASS '+JSON.stringify(equipmentCoords));
    await equipmentBuilder.locator('article h2').first().click();
    await admin.waitForFunction(()=>(
      document.querySelector('#esc-vb-section-summary')?.textContent||'').includes('home_04'),
      null,{timeout:18000});
    const equipmentFields=await admin.locator('#esc-vb-edit-row option').evaluateAll(els=>els.map(el=>el.value));
    for(const field of ['title','description','button_label','button_href'])
      assert(equipmentFields.includes(field),'Home04 Builder: missing editable field '+field);
    console.log('HOME04_BUILDER_SELECTION=PASS '+equipmentFields.join(','));
    await admin.screenshot({path:'artifacts/home03/builder-readonly.png'});
    console.log('HOME03_BUILDER_SELECTION=PASS '+options.join(','));
    await admin.close();
    console.log('HOME03_PRODUCTION_QA=PASS');
  } finally {await browser.close();}
})().catch(error=>{console.error('HOME03_PRODUCTION_QA=FAIL '+(error.stack||error.message));process.exitCode=1;});
