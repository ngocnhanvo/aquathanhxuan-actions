// Production acceptance for a real nested Product ESC Table in Hot Combo.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE='https://aquathanhxuan.io.vn';
const WP='https://admin.aquathanhxuan.io.vn';
const CHILD='tool_combo01';
const IDS=['82561','82562','82564','82566'];
const NAMES=['LED rọi Kaokui KK-F06','Chân gỗ 40x40x70','Bể cubic 40 siêu trong','Máy Lọc Treo Xiaoli Sunsun XBL 500'];
(async()=>{
 const resp=await fetch(WP+'/wp-json/tablepress/v1/table/home_03?qa='+Date.now());
 assert.equal(resp.status,200,'Parent ESC Table not available');
 const table=await resp.json();
 assert.equal(table.items?.[0]?.['shortcode-products'],CHILD,'Parent must own child shortcode reference');
 const childResp=await fetch(WP+'/wp-json/tablepress/v1/table/'+CHILD+'?qa='+Date.now());
 assert.equal(childResp.status,200,'Child Product ESC Table missing');
 const child=await childResp.json();
 assert.equal(child.meta?.api,'Product','Child source must be Product');
 assert.deepEqual(child.items?.map(x=>String(x.key||x['api-key'])),IDS,'Product selection drift');
 console.log('HOT_COMBO_CMS_CONTRACT_PASS');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[1440,900],[1024,768],[768,1024],[844,390],[390,844]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.goto(BASE+'/?hotcomboqa='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
   const section=page.locator('[data-aqua-home-combo]');
   await section.waitFor({state:'visible',timeout:30000});
   await section.scrollIntoViewIfNeeded();
   const cards=section.locator('.aqua-hot-combo__products .aqua-hot-combo__product');
   await cards.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
   assert.equal(await cards.count(),4,'Expected four authentic combo constituents at '+width);
   const rows=await cards.evaluateAll(els=>els.map(el=>({
    id:el.getAttribute('data-esc-builder-product-id'),
    name:el.querySelector('.aqua-hot-combo__product-name')?.textContent?.trim(),
    href:el.querySelector('.aqua-hot-combo__product-name')?.getAttribute('href'),
    amount:el.querySelector('.aqua-hot-combo__price')?.textContent?.trim(),
    imageOK:Boolean(el.querySelector('img')?.complete&&el.querySelector('img')?.naturalWidth>0)
   })));
   assert.deepEqual(rows.map(x=>x.name),NAMES,'Names/order are not from WordPress Product table');
   assert(rows.every(x=>x.amount&&x.imageOK),'Prices or product images missing');
   assert.deepEqual(rows.map(x=>(x.amount||'').replace(/\D/g,'')),['320000','1500000','1050000','300000'],'Origin product prices changed');
   assert.equal(await section.locator('.aqua-hot-combo__products').getAttribute('data-esc-source-table'),CHILD);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Horizontal overflow '+width);
   console.log('HOT_COMBO_VIEWPORT_PASS='+width+'x'+height+' '+JSON.stringify(rows));
   await page.close();
  }
  assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'CMS credentials missing');
  const admin=await browser.newPage({viewport:{width:1440,height:900}});
  await admin.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
  if(await admin.locator('#user_login').count()){
   await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await admin.locator('#wp-submit').click();
  }
  try {
    await admin.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{waitUntil:'domcontentloaded',timeout:30000});
  } catch(error) {
    console.log('HOT_COMBO_ADMIN_LOGIN_DIAGNOSTIC='+JSON.stringify({
      url:admin.url(),title:await admin.title(),
      loginForm:await admin.locator('#user_login').count(),
      error:await admin.locator('#login_error').allTextContents(),
      notice:await admin.locator('.message,.notice').allTextContents(),
      formCount:await admin.locator('form').count()
    }));
    throw error;
  }
  await admin.goto(WP+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',{waitUntil:'domcontentloaded',timeout:60000});
  const frame=admin.frameLocator('#esc-vb-frame');
  const iframeSrc=await admin.locator('#esc-vb-frame').getAttribute('src');
  console.log('HOT_COMBO_BUILDER_PARENT='+JSON.stringify({title:await admin.title(),url:admin.url(),iframeSrc}));
  await frame.locator('body').waitFor({state:'attached',timeout:40000});
  const diagnosis=await frame.locator('body').evaluate(el=>({
    url:document.URL,title:document.title,
    comboCount:document.querySelectorAll('[data-aqua-home-combo]').length,
    childCount:document.querySelectorAll('.aqua-hot-combo__products').length,
    sectionIds:[...document.querySelectorAll('[data-tablepress-preview]')].map(x=>x.getAttribute('data-tablepress-preview')).slice(0,25),
    textSample:el.innerText.slice(0,900)
  }));
  console.log('HOT_COMBO_BUILDER_FRAME_DIAGNOSTIC='+JSON.stringify(diagnosis));
  const ticket = new URL(iframeSrc).searchParams.get('ticket');
  const stateResponse=await admin.request.post(WP+'/wp-json/esc-builder/v1/page-state',{
    data:{page_id:82454,ticket,include_rules:true}});
  const statePayload=await stateResponse.json();
  console.log('HOT_COMBO_PAGE_STATE_DIAGNOSTIC='+JSON.stringify({
    status:stateResponse.status(),
    tables:statePayload.tables?.map(x=>({id:x.id,exists:x.exists})),
    childEditable:statePayload.editable?.[CHILD],
    error:statePayload.code
  }));
  const srcResponse=await admin.request.post(WP+'/wp-json/esc-builder/v1/table-source',{
    data:{page_id:82454,ticket,table_id:CHILD}});
  const srcPayload=await srcResponse.json();
  console.log('HOT_COMBO_CHILD_SOURCE_DIAGNOSTIC='+JSON.stringify({
    status:srcResponse.status(),sourceId:srcPayload.table?.id,
    api:srcPayload.table?.meta?.api,rows:srcPayload.table?.items?.length,
    error:srcPayload.code
  }));
  console.log('HOT_COMBO_PREVIEW_SECTION_DIAGNOSTIC='+JSON.stringify(
    await frame.locator('[data-aqua-home-combo]').evaluate(el=>({
      text:el.innerText.slice(0,700),
      sourceTable:el.getAttribute('data-esc-source-table'),
      nestedTables:[...el.querySelectorAll('[data-esc-source-table]')].map(x=>x.getAttribute('data-esc-source-table'))
    }))));
  const grid=frame.locator('.aqua-hot-combo__products');
  await grid.waitFor({state:'visible',timeout:45000});
  assert.equal(await grid.getAttribute('data-esc-source-table'),CHILD,'Builder child Product table identity');
  const coordinates=await grid.locator('.aqua-hot-combo__product').evaluateAll(els=>els.map(el=>({
    id:el.getAttribute('data-esc-builder-product-id'),
    row:el.getAttribute('data-esc-builder-row'),
    version:el.parentElement?.getAttribute('data-esc-rendered-version')
  })));
  assert.deepEqual(coordinates.map(x=>x.id),IDS,'Visual Builder Product ID mismatch');
  assert.deepEqual(coordinates.map(x=>x.row),['0','1','2','3'],'Visual Builder original Product row mismatch');
  assert(coordinates.every(x=>/^[a-f0-9]{64}$/.test(x.version||'')),'Child row version missing');
  assert.equal(await grid.locator('template[data-esc-builder-product-template]').count(),1,'No live Product mutation template');
  console.log('HOT_COMBO_BUILDER_SOURCE_PASS='+JSON.stringify(coordinates));
  assert.equal(await grid.getAttribute('data-esc-builder-product-track'),'true',
    'The generic nested Product mutation adapter must be deployed to Builder');

  // Real WordPress + Astro production smoke test, deliberately READ ONLY.
  // These gestures open mutation UIs and select candidates, but every Save,
  // Confirm delete and Swap commit control is left untouched.
  const mutationRequests=[];
  admin.on('request',request=>{
    if (/\\/esc-builder\\/v1\\/(?:insert-item|delete-item|swap-items)(?:[/?]|$)/.test(request.url()))
      mutationRequests.push(request.url());
  });
  const firstCard=grid.locator('.aqua-hot-combo__product').first();
  await firstCard.locator('.aqua-hot-combo__product-name').click();
  await admin.waitForFunction(id=>
    document.querySelector('#esc-vb-item-context')?.textContent?.includes(id+' · dòng 1'),
    CHILD,{timeout:15000});
  assert(!((await admin.locator('#esc-vb-item-status').textContent())||'')
    .includes('Section không được phép chỉnh sửa'),'Product child selection must be authorized');

  // The Add dialog must be able to read its Product schema and search the
  // genuine WooCommerce catalog; already selected IDs remain disabled.
  await admin.locator('#esc-vb-item-new').click();
  await admin.locator('#esc-vb-item-dialog[open]').waitFor({state:'visible',timeout:15000});
  const productSearch=admin.locator('#esc-vb-item-fields input[type="search"]');
  await productSearch.waitFor({state:'visible',timeout:20000});
  assert((await admin.locator('#esc-vb-item-dialog-context').textContent()).includes(CHILD));
  await productSearch.fill('Kaokui');
  const existingProduct=admin.locator('.esc-vb-product-results button')
    .filter({hasText:'ID 82561'}).first();
  await existingProduct.waitFor({state:'visible',timeout:20000});
  assert.equal(await existingProduct.isDisabled(),true,
    'Add dialog must block duplicate Product IDs');
  assert.equal(await admin.locator('#esc-vb-item-confirm').isDisabled(),true,
    'Adding without a newly selected Product is not allowed');
  await admin.locator('#esc-vb-item-dismiss').click();

  // Shared red/blue item picker must work for tool_combo01 without a fallback
  // ID list. Cancel must restore the original cards without a write request.
  await admin.locator('#esc-vb-item-sort-open').click();
  await frame.locator('[data-esc-builder-product-id="82561"][data-esc-vb-item-source]')
    .waitFor({state:'visible',timeout:20000});
  await grid.locator('.aqua-hot-combo__product').nth(1)
    .locator('.aqua-hot-combo__product-name').click();
  await frame.locator('[data-esc-builder-product-id="82562"][data-esc-vb-item-target]')
    .waitFor({state:'visible',timeout:15000});
  await admin.waitForFunction(()=>
    document.querySelector('#esc-vb-item-sort-save')?.disabled===false,
    null,{timeout:15000});
  assert.equal(await admin.locator('#esc-vb-item-sort-preview-list').isVisible(),false,
    'Hot Combo direct card picker must not fall back to an indexed item list');
  await admin.locator('#esc-vb-item-sort-cancel').click();
  await frame.locator('[data-esc-builder-product-id="82561"][data-esc-vb-item-source]')
    .waitFor({state:'hidden',timeout:12000});

  // Validate the exact-row guarded Delete confirmation but never press Confirm.
  await firstCard.locator('.aqua-hot-combo__product-name').click();
  await admin.waitForFunction(id=>
    document.querySelector('#esc-vb-item-context')?.textContent?.includes(id+' · dòng 1'),
    CHILD,{timeout:15000});
  await admin.locator('#esc-vb-item-delete').click();
  await admin.locator('#esc-vb-item-delete-dialog[open]')
    .waitFor({state:'visible',timeout:15000});
  await admin.waitForFunction(()=>
    document.querySelector('#esc-vb-item-delete-confirm')?.disabled===false,
    null,{timeout:15000});
  assert((await admin.locator('#esc-vb-item-delete-context').textContent()).includes('82561'),
    'Delete dialog must bind the exact original Product row');
  await admin.locator('#esc-vb-item-delete-dismiss').click();
  assert.deepEqual(await grid.locator('.aqua-hot-combo__product')
    .evaluateAll(els=>els.map(el=>el.getAttribute('data-esc-builder-product-id'))),IDS,
    'Cancelled Add, Sort and Delete must preserve the live Builder Product cards');
  assert.deepEqual(mutationRequests,[], 'Read-only QA must never send a mutation request');
  const afterResponse=await fetch(WP+'/wp-json/tablepress/v1/table/'+CHILD+'?afterUi='+Date.now());
  assert.equal(afterResponse.status,200,'Final canonical Product source not available');
  const afterTable=await afterResponse.json();
  assert.deepEqual(afterTable.items,child.items,'Read-only Builder QA changed ESC Table source unexpectedly');
  console.log('HOT_COMBO_BUILDER_ITEM_MANAGEMENT_PASS: add-search, red-blue sort cancel, guarded delete cancel, canonical source unchanged');

  await admin.close();
  console.log('HOT_COMBO_NESTED_PRODUCTION_QA_PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error('HOT_COMBO_NESTED_PRODUCTION_QA_FAIL='+e.stack);process.exitCode=1});
