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
  await admin.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
  await admin.goto(WP+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',{waitUntil:'domcontentloaded',timeout:60000});
  const grid=admin.frameLocator('#esc-vb-frame').locator('.aqua-hot-combo__products');
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
  await admin.close();
  console.log('HOT_COMBO_NESTED_PRODUCTION_QA_PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error('HOT_COMBO_NESTED_PRODUCTION_QA_FAIL='+e.stack);process.exitCode=1});
