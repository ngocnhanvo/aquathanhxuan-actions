// Read-only acceptance test: actual WordPress source -> Astro -> Builder.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const ROOT='https://aquathanhxuan.io.vn';
const WP='https://admin.aquathanhxuan.io.vn';
const expectedSource=JSON.parse(fs.readFileSync('chatgpt/home02products-import-status.json','utf8'));
const expected=(expectedSource.mappings||[]).map(x=>String(x.target_id));
assert.equal(expected.length,10,'Expected ten verified migrated products');
const widths=[[1440,900],[1024,768],[768,1024],[844,390],[390,844]];
const output='artifacts/home02products';
fs.mkdirSync(output,{recursive:true});
const report={cms:false,frontend:[],builder:false,ids:expected};
const request=async u=>{
 const res=await fetch(u,{headers:{'cache-control':'no-cache'}});
 assert.equal(res.status,200,'HTTP for '+u);
 return res.json();
};
(async()=>{
 try{
  const table=await request(WP+'/wp-json/tablepress/v1/table/home_02products?qa='+Date.now());
  assert.equal(table.meta?.api,'Product','Wrong native ESC Table API');
  assert.deepEqual((table.items||[]).map(x=>String(x.key||'')).filter(Boolean),expected,
   'ESC Table product IDs differ from verified WooCommerce migration');
  const pageData=await request(WP+'/wp-json/wp/v2/pages/82454?_fields=id,content');
  assert(String(pageData.content?.rendered||'').includes('home_02products'),
   'Homepage Page shortcode not inserted natively');
  report.cms=true;
  const serialized=await request(ROOT+'/data/page-default.json?qa='+Date.now());
  const block=(serialized.contents||[]).find(x=>x.shortcode==='home_02products');
  assert(block,'Astro serialized Page missing curated ESC Table');
  assert.equal(block.data?.id,'home_02products','Wrong table materialized into Page');
  report.cachedIds=(block.data?.items||[]).map(x=>String(x.keyAPI||x.key||x._id||'')).filter(Boolean);
  assert.deepEqual(report.cachedIds,expected,'Processed source IDs differ from CMS');

  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
   for(const [width,height] of widths){
    const ctx=await browser.newContext({viewport:{width,height}});
    const page=await ctx.newPage();
    await page.goto(ROOT+'/?home02qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
    const section=page.locator('[data-aqua-home-substrate]');
    await section.waitFor({state:'visible',timeout:30000});
    const cards=section.locator('[data-substrate-card]');
    assert.equal(await cards.count(),10,'Expected 10 visible-or-paginated product items');
    const ids=await cards.evaluateAll(nodes=>nodes.map(node=>
      String(node.querySelector('[data-substrate-add]')?.getAttribute('data-product-id')||'')));
    assert.deepEqual(ids,expected,'Grid product ordering differs from separate ESC Table');
    const menu=section.locator('.aqua-substrate-catalog__sidebar nav a');
    assert.equal(await menu.count(),9,'Sidebar should contain nine real children of Nền');
    assert.equal(await section.locator('[data-substrate-filter]').count(),0,'Obsolete filter button still exists');
    assert.equal(await section.getByText('Tất cả sản phẩm',{exact:true}).count(),0);
    assert.equal(await section.locator('.aqua-substrate-catalog__feature').count(),0,'Old sidebar image still exists');
    const links=await menu.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
    assert(links.every(x=>x&&x!=='#'&&!x.startsWith('javascript:')),'Invalid child category URL');
    const dimensions=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth}));
    assert(dimensions.doc<=dimensions.w+1,'Horizontal overflow at '+width+'px');
    await section.scrollIntoViewIfNeeded();
    const first=cards.first().locator('img');
    await first.evaluate(async img=>{await img.decode()});
    assert(await first.evaluate(img=>img.naturalWidth>0),'Broken actual product media');
    const before=await cards.locator(':scope:visible').count().catch(()=>0);
    const next=section.locator('[data-substrate-next]');
    if(await next.isEnabled()){
      const firstName=await cards.locator('.aqua-substrate-catalog__name').first().textContent();
      await next.click();
      const newName=await section.locator('[data-substrate-card]:visible .aqua-substrate-catalog__name').first().textContent();
      assert(newName!==firstName,'Pagination did not advance');
    }
    await section.screenshot({path:output+'/home02-'+width+'x'+height+'.png'});
    report.frontend.push({width,height,cards:ids.length,categories:links.length,overflow:false});
    await ctx.close();
   }
   if(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD){
    const ctx=await browser.newContext({viewport:{width:1440,height:900}});
    const page=await ctx.newPage();
    await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded'});
    if(await page.locator('#user_login').count()){
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
    await page.goto(WP+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',
      {waitUntil:'domcontentloaded',timeout:60000});
    const frame=page.frameLocator('#esc-vb-frame');
    const grid=frame.locator('[data-esc-source-table="home_02products"]');
    await grid.first().waitFor({state:'attached',timeout:40000});
    assert.equal(await grid.locator('[data-esc-builder-product-id]').count(),10,
     'Not all WooCommerce Product rows are selectable in Builder');
    assert.equal(await grid.locator('[data-esc-builder-product-template]').count(),1,
     'Missing instant Product insert template');
    const selectedIds=await grid.locator('[data-esc-builder-product-id]').evaluateAll(nodes=>
      nodes.map(n=>n.getAttribute('data-esc-builder-product-id')));
    assert.deepEqual(selectedIds,expected,'Builder binds wrong Product IDs');
    report.builder=true;
    await ctx.close();
   }
  }finally{await browser.close()}
  console.log('HOME02_PRODUCTS_ACCEPTANCE_PASS='+JSON.stringify(report));
 }catch(e){
  report.error=String(e.stack||e);
  console.error('HOME02_PRODUCTS_ACCEPTANCE_FAIL='+report.error);
  process.exitCode=1;
 }finally{
  fs.mkdirSync('chatgpt',{recursive:true});
  fs.writeFileSync('chatgpt/home02products-live.json',JSON.stringify(report,null,2)+'\n');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
