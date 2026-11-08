'use strict';
// Read-only production QA for nested Home 06 filters and Home 07 lighting.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const WP='https://admin.aquathanhxuan.io.vn',SITE='https://aquathanhxuan.io.vn',HOME=82454;
const request=JSON.parse(fs.readFileSync('qa-requests/equipment-production.json','utf8'));
assert(/^[a-f0-9]{40}$/.test(request.source_sha),'QA source SHA missing or invalid');
const configs=[
 {id:'home_06',child:'tool_home06products',expected:10,slug:'may-loc'},
 {id:'home_07',child:'tool_home07products',expected:9,slug:'den'}
];
const json=async url=>{
 const r=await fetch(url,{headers:{'Cache-Control':'no-cache'}});
 assert.equal(r.status,200,'HTTP '+url);return r.json();
};
(async()=>{
 const marker=await json(SITE+'/aquathanhxuan-staging-build.json?qa='+Date.now());
 assert.equal(marker.commit,request.source_sha,'Production Astro build source SHA mismatch');
 console.log('EQUIPMENT_DEPLOY_READY='+request.source_sha);
 const previous=['home_00','home_01','home_02','home_03','home_04','home_06','home_07','home_05'];
 const productsBySection=new Map(),snapshots=new Map();
 for(const config of configs){
  const parent=await json(WP+'/wp-json/tablepress/v1/table/'+config.id+'?qa='+Date.now());
  const child=await json(WP+'/wp-json/tablepress/v1/table/'+config.child+'?qa='+Date.now());
  assert.equal(parent.items?.length,1,'Unexpected parent row count '+config.id);
  assert.equal(parent.items[0]['shortcode-products'],config.child,'Missing Product child binding');
  assert.equal(parent.items[0].button_href,'/san-pham/'+config.slug,'Wrong taxonomy URL');
  assert.equal(child.meta?.api,'Product','Wrong nested source type '+config.child);
  const ids=child.items.map(r=>String(r.key||r['api-key']||''));
  assert.equal(ids.length,config.expected,'Unexpected item count '+config.child);
  assert(ids.every(id=>/^\d+$/.test(id))&&new Set(ids).size===ids.length,'Invalid curated Product IDs');
  const products=await Promise.all(ids.map(id=>json(WP+'/wp-json/wc/store/v1/products/'+id)));
  assert(products.every((p,i)=>String(p.id)===ids[i]&&p.name&&Number(p.prices?.price)>0&&p.images?.[0]?.src),
    'Product catalog contains missing/misordered WooCommerce records');
  productsBySection.set(config.id,ids);
  snapshots.set(config.child,child.items);
  console.log('EQUIPMENT_TABLE_SOURCE_PASS='+config.id+' count='+ids.length);
 }
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[1440,900],[1024,768],[768,1024],[844,390],[390,844]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.goto(SITE+'/?equipmentqa='+Date.now(),{waitUntil:'domcontentloaded',timeout:65000});
   for(const config of configs){
    const section=page.locator('[data-aqua-home-substrate][data-esc-source-table="'+config.id+'"]');
    await section.waitFor({state:'visible',timeout:40000});
    await section.scrollIntoViewIfNeeded();
    const grid=section.locator('[data-substrate-products]');
    assert.equal(await grid.getAttribute('data-esc-source-table'),config.child,
      'Wrong nested Product track '+config.id);
    const cards=grid.locator('[data-substrate-card]');
    const ids=productsBySection.get(config.id);
    assert.equal(await cards.count(),ids.length,'Wrong rendered curated Product count '+config.id);
    const names=await cards.evaluateAll(nodes=>nodes.map(n=>
      n.querySelector('.aqua-substrate-catalog__name')?.textContent?.trim()));
    assert(names.every(Boolean),'Missing genuine Product names '+config.id);
    const prices=await cards.evaluateAll(nodes=>nodes.map(n=>
      n.querySelector('.aqua-substrate-catalog__prices strong')?.textContent?.trim()));
    assert(prices.every(Boolean),'Missing Product prices '+config.id);
    const imgs=await cards.evaluateAll(nodes=>nodes.map(n=>n.querySelector('img')?.getAttribute('src')));
    assert(imgs.every(Boolean),'Product image src missing '+config.id);
    const rootCount=await section.locator('.aqua-substrate-catalog__tabs .aqua-substrate-catalog__tab').count();
    assert(rootCount>=2,'Equipment subcategory sidebar missing '+config.id);
    const pathName=path.join('qa-artifacts','equipment',config.id+'-'+width+'x'+height+'.png');
    fs.mkdirSync(path.dirname(pathName),{recursive:true});
    await section.screenshot({path:pathName,timeout:25000});
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
     'Horizontal overflow '+width+'x'+height);
   console.log('EQUIPMENT_VIEWPORT_PASS='+width+'x'+height);
   await page.close();
  }
  const admin=await browser.newPage({viewport:{width:1440,height:900}});
  assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WordPress Builder credentials missing');
  await admin.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
  if(await admin.locator('#user_login').count()){
   await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await admin.locator('#wp-submit').click();
  }
  await admin.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:35000});
  await admin.goto(WP+'/wp-admin/post.php?post='+HOME+'&action=edit&esc_full_admin=1',
    {waitUntil:'domcontentloaded',timeout:50000});
  const raw=await admin.locator('#content').inputValue();
  const shortcodes=[...raw.matchAll(/\[table\s+id=['"]?([a-zA-Z0-9_-]+)/g)].map(m=>m[1]);
  assert.deepEqual(shortcodes,previous,'Native Page shortcode order and uniqueness changed');
  for(const config of configs)assert(!raw.includes('[table id='+config.child+' /]'),
    'Nested Product table must be referenced only by parent '+config.id);
  await admin.goto(WP+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page='+HOME,
    {waitUntil:'domcontentloaded',timeout:65000});
  const frame=admin.frameLocator('#esc-vb-frame');
  const src=await admin.locator('#esc-vb-frame').getAttribute('src');
  assert(src,'Builder iframe URL missing');
  const ticket=new URL(src,WP).searchParams.get('ticket');
  assert(ticket,'Builder ticket missing');
  const state=await admin.request.post(WP+'/wp-json/esc-builder/v1/page-state',
    {data:{page_id:HOME,ticket,include_rules:true}});
  assert.equal(state.status(),200,'Builder page-state unauthorized');
  const manifest=await state.json();
  const mutationRequests=[];
  admin.on('request',r=>{
   if(/\/esc-builder\/v1\/(?:insert-item|delete-item|swap-items)(?:[/?]|$)/.test(r.url()))
    mutationRequests.push(r.url());
  });
  for(const config of configs){
   const section=frame.locator('[data-aqua-home-substrate][data-esc-source-table="'+config.id+'"]');
   await section.waitFor({state:'visible',timeout:55000});
   const grid=section.locator('[data-substrate-products]');
   assert.equal(await grid.getAttribute('data-esc-source-table'),config.child,'Builder nested identity mismatch');
   assert(manifest.tables.some(t=>t.id===config.child&&t.exists),'Nested table missing from Builder manifest');
   const ids=productsBySection.get(config.id);
   const cards=grid.locator('[data-substrate-card]');
   const coords=await cards.evaluateAll(nodes=>nodes.map(e=>({
     id:e.getAttribute('data-esc-builder-product-id'),row:e.getAttribute('data-esc-builder-row'),
     version:e.parentElement?.getAttribute('data-esc-rendered-version')
   })));
   assert.deepEqual(coords.map(x=>x.id),ids,'Builder WooCommerce identity mismatch '+config.child);
   assert.deepEqual(coords.map(x=>x.row),ids.map((_,i)=>String(i)),
     'Builder original row indexes mismatch '+config.child);
   assert(coords.every(x=>/^[a-f0-9]{64}$/.test(x.version||'')),
     'Missing canonical ESC Table version '+config.child);
   assert.equal(await grid.locator('template[data-esc-builder-product-template]').count(),1,
     'Missing native Product preview template '+config.child);
   const source=await admin.request.post(WP+'/wp-json/esc-builder/v1/table-source',
     {data:{page_id:HOME,ticket,table_id:config.child}});
   assert.equal(source.status(),200,'Builder scoped Product source authorization denied '+config.child);
   const sourceData=await source.json();
   assert.equal(sourceData.table?.meta?.api,'Product','Builder loaded wrong Product source');
   const first=cards.first();
   await first.locator('.aqua-substrate-catalog__name').click();
   await admin.waitForFunction(id=>
     document.querySelector('#esc-vb-item-context')?.textContent?.includes(id+' · dòng 1'),
     config.child,{timeout:20000});
   await admin.locator('#esc-vb-item-new').click();
   await admin.locator('#esc-vb-item-dialog[open]').waitFor({state:'visible',timeout:16000});
   await admin.locator('#esc-vb-item-fields input[type="search"]').waitFor({state:'visible',timeout:18000});
   await admin.locator('#esc-vb-item-dismiss').click();
   await admin.locator('#esc-vb-item-sort-open').click();
   await grid.locator('[data-esc-builder-product-id="'+ids[0]+'"][data-esc-vb-item-source]')
     .waitFor({state:'visible',timeout:12000});
   await cards.nth(1).locator('.aqua-substrate-catalog__name').click();
   await grid.locator('[data-esc-builder-product-id="'+ids[1]+'"][data-esc-vb-item-target]')
     .waitFor({state:'visible',timeout:12000});
   assert.equal(await admin.locator('#esc-vb-item-sort-save').isDisabled(),false,
     'Shared red-blue Product sorter disabled '+config.child);
   assert.equal(await admin.locator('#esc-vb-item-sort-preview-list').isVisible(),false,
     'Should not expose separate ID sorter '+config.child);
   await admin.locator('#esc-vb-item-sort-cancel').click();
   await first.locator('.aqua-substrate-catalog__name').click();
   await admin.locator('#esc-vb-item-delete').click();
   await admin.locator('#esc-vb-item-delete-dialog[open]').waitFor({state:'visible',timeout:15000});
   assert((await admin.locator('#esc-vb-item-delete-context').textContent()).includes(ids[0]),
     'Delete confirmation wrong Product '+config.child);
   await admin.locator('#esc-vb-item-delete-dismiss').click();
   console.log('EQUIPMENT_BUILDER_PASS='+config.child);
  }
  assert.deepEqual(mutationRequests,[],'Read-only Builder QA must never save Product references');
  for(const config of configs){
   const persisted=await json(WP+'/wp-json/tablepress/v1/table/'+config.child+'?qaAfter='+Date.now());
   assert.deepEqual(persisted.items,snapshots.get(config.child),'Product selection changed during QA');
  }
  await admin.close();
  console.log('EQUIPMENT_PRODUCTION_QA_PASS');
 }finally{await browser.close()}
})().catch(e=>{console.error('EQUIPMENT_PRODUCTION_QA_FAIL='+e.stack);process.exitCode=1});
