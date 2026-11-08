// Production read-only QA for Home 02 -> nested tool_ Product ESC Table.
// All Product IDs and order come from the real WordPress table, not fixtures.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const WP='https://admin.aquathanhxuan.io.vn';
const SITE='https://aquathanhxuan.io.vn';
const PARENT='home_02',LEGACY='home_02products',CHILD='tool_home02products';
const request=JSON.parse(fs.readFileSync('qa-requests/home02-nested-production.json','utf8'));
assert(/^[a-f0-9]{40}$/.test(request.source_sha),'Invalid pinned source SHA');
const json=async url=>{const r=await fetch(url,{headers:{'Cache-Control':'no-cache'}});assert.equal(r.status,200,'HTTP '+url);return r.json()};
(async()=>{
 const marker=await json(SITE+'/aquathanhxuan-staging-build.json?qa='+Date.now());
 assert.equal(marker.commit,request.source_sha,'Production is not serving the requested Astro source');
 console.log('HOME02_NESTED_DEPLOY_READY='+request.source_sha);
 const parent=await json(WP+'/wp-json/tablepress/v1/table/'+PARENT+'?qa='+Date.now());
 const child=await json(WP+'/wp-json/tablepress/v1/table/'+CHILD+'?qa='+Date.now());
 const old=await json(WP+'/wp-json/tablepress/v1/table/'+LEGACY+'?qa='+Date.now());
 assert.equal(parent.items?.[0]?.['shortcode-products'],CHILD,'Parent missing child link');
 assert.equal(child.meta?.api,'Product','Child is not Product source');
 const ids=child.items.map(x=>String(x.key||x['api-key']||''));
 assert(ids.length>0&&ids.length<=48,'Unexpected number of curated Products');
 assert.deepEqual(ids,old.items.map(x=>String(x.key||x['api-key']||'')),
   'Product references or their order changed during migration');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[1440,900],[1024,768],[768,1024],[844,390],[390,844]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.goto(SITE+'/?home02nested='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
   const section=page.locator('[data-aqua-home-substrate]').first();
   await section.waitFor({state:'visible',timeout:35000});
   const grid=section.locator('[data-substrate-products]');
   assert.equal(await grid.getAttribute('data-esc-source-table'),CHILD,'Rendered child source identity');
   const cards=grid.locator('[data-substrate-card]');
   assert.equal(await cards.count(),ids.length,'Rendered Product count');
   const visible=cards.locator('visible=true');
   const names=await cards.evaluateAll(els=>els.map(x=>x.querySelector('.aqua-substrate-catalog__name')?.textContent?.trim()));
   assert(names.every(Boolean),'WooCommerce Product name missing');
   const noPrice=await cards.evaluateAll(els=>els.filter(x=>!x.querySelector('.aqua-substrate-catalog__prices strong')?.textContent?.trim()).length);
   assert.equal(noPrice,0,'Rendered Product price missing');
   await section.scrollIntoViewIfNeeded();
   const images=await cards.evaluateAll(els=>els.filter(x=>!x.hidden).map(x=>x.querySelector('img')?.getAttribute('src')));
   assert(images.every(Boolean),'Visible Product image URL missing');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow '+width);
   console.log('HOME02_NESTED_VIEWPORT_PASS='+width+'x'+height+' products='+ids.length);
   await page.close();
  }
  const admin=await browser.newPage({viewport:{width:1440,height:900}});
  assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing admin QA credentials');
  await admin.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
  if(await admin.locator('#user_login').count()){
   await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await admin.locator('#wp-submit').click();
  }
  await admin.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:35000});
  await admin.goto(WP+'/wp-admin/post.php?post=82454&action=edit&esc_full_admin=1',{waitUntil:'domcontentloaded',timeout:45000});
  const raw=await admin.locator('#content').inputValue();
  assert.equal((raw.match(/\[table id=home_02 \/\]/g)||[]).length,1,'Only one Home 02 parent embed required');
  assert(!raw.includes('[table id='+LEGACY+' /]'),'Legacy standalone Product embed still exists');
  assert(!raw.includes('[table id='+CHILD+' /]'),'Child should not be embedded directly');
  await admin.goto(WP+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',
    {waitUntil:'domcontentloaded',timeout:60000});
  const frame=admin.frameLocator('#esc-vb-frame');
  const section=frame.locator('[data-aqua-home-substrate]').first();
  await section.waitFor({state:'visible',timeout:45000});
  const grid=section.locator('[data-substrate-products]');
  assert.equal(await grid.getAttribute('data-esc-source-table'),CHILD,'Builder nested Product source');
  const coords=await grid.locator('[data-substrate-card]').evaluateAll(els=>els.map(e=>({
    id:e.getAttribute('data-esc-builder-product-id'),
    row:e.getAttribute('data-esc-builder-row'),
    version:e.parentElement?.getAttribute('data-esc-rendered-version')
  })));
  assert.deepEqual(coords.map(x=>x.id),ids,'Builder nested Product rows/identity drift');
  assert.deepEqual(coords.map(x=>x.row),ids.map((_,i)=>String(i)),'Original Product row mismatch');
  assert(coords.every(x=>/^[a-f0-9]{64}$/.test(x.version||'')),'Missing canonical row version');
  assert.equal(await grid.locator('template[data-esc-builder-product-template]').count(),1,'Missing Product preview template');
  const frameSrc=await admin.locator('#esc-vb-frame').getAttribute('src');
  const ticket=new URL(frameSrc).searchParams.get('ticket');
  const state=await admin.request.post(WP+'/wp-json/esc-builder/v1/page-state',
    {data:{page_id:82454,ticket,include_rules:true}});
  assert.equal(state.status(),200,'Visual Builder page-state denied');
  const stateData=await state.json();
  assert(stateData.tables.some(t=>t.id===CHILD&&t.exists),'Nested Product source absent from Page manifest');
  const source=await admin.request.post(WP+'/wp-json/esc-builder/v1/table-source',
    {data:{page_id:82454,ticket,table_id:CHILD}});
  assert.equal(source.status(),200,'Nested Product source not authorized');
  const sourceData=await source.json();
  assert.equal(sourceData.table?.meta?.api,'Product','Builder resolved wrong source type');
  const mutations=[];
  admin.on('request',req=>{
   if(/\/esc-builder\/v1\/(?:insert-item|delete-item|swap-items)(?:[/?]|$)/.test(req.url()))
    mutations.push(req.url());
  });
  const first=grid.locator('[data-substrate-card]').first();
  await first.locator('.aqua-substrate-catalog__name').click();
  await admin.waitForFunction(id=>
     document.querySelector('#esc-vb-item-context')?.textContent?.includes(id+' · dòng 1'),
     CHILD,{timeout:15000});
  await admin.locator('#esc-vb-item-new').click();
  await admin.locator('#esc-vb-item-dialog[open]').waitFor({state:'visible',timeout:15000});
  await admin.locator('#esc-vb-item-fields input[type="search"]').waitFor({state:'visible',timeout:20000});
  assert((await admin.locator('#esc-vb-item-dialog-context').textContent()).includes(CHILD),
    'Add source must be child Product table');
  await admin.locator('#esc-vb-item-dismiss').click();
  await admin.locator('#esc-vb-item-sort-open').click();
  await grid.locator('[data-esc-builder-product-id="'+ids[0]+'"][data-esc-vb-item-source]')
    .waitFor({state:'visible',timeout:12000});
  await grid.locator('[data-substrate-card]').nth(1).locator('.aqua-substrate-catalog__name').click();
  await grid.locator('[data-esc-builder-product-id="'+ids[1]+'"][data-esc-vb-item-target]')
    .waitFor({state:'visible',timeout:12000});
  assert.equal(await admin.locator('#esc-vb-item-sort-save').isDisabled(),false,
    'Shared red/blue picker not enabled');
  assert.equal(await admin.locator('#esc-vb-item-sort-preview-list').isVisible(),false,
    'Should not fall back to Product ID list');
  await admin.locator('#esc-vb-item-sort-cancel').click();
  await first.locator('.aqua-substrate-catalog__name').click();
  await admin.locator('#esc-vb-item-delete').click();
  await admin.locator('#esc-vb-item-delete-dialog[open]').waitFor({state:'visible',timeout:15000});
  assert((await admin.locator('#esc-vb-item-delete-context').textContent()).includes(ids[0]),
    'Delete dialog not scoped to selected Product');
  await admin.locator('#esc-vb-item-delete-dismiss').click();
  assert.deepEqual(mutations,[],'QA may not write production Product references');
  const after=await json(WP+'/wp-json/tablepress/v1/table/'+CHILD+'?qaAfter='+Date.now());
  assert.deepEqual(after.items,child.items,'Builder QA modified child Product table');
  console.log('HOME02_NESTED_BUILDER_PASS='+JSON.stringify({parent:PARENT,child:CHILD,products:ids.length,readonly:true}));
  await admin.close();
  console.log('HOME02_NESTED_PRODUCTION_QA_PASS');
 }finally{await browser.close()}
})().catch(e=>{console.error('HOME02_NESTED_PRODUCTION_QA_FAIL='+e.stack);process.exitCode=1});
