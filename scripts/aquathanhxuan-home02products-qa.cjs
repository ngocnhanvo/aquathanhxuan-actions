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
    report.sidebar=await menu.evaluateAll(nodes=>nodes.map(n=>({name:n.textContent?.trim(),href:n.getAttribute('href')})));
    console.log('HOME02_SIDEBAR_ACTUAL='+JSON.stringify(report.sidebar));
    const sourceCategories=await request(WP+'/wp-json/wc/store/v1/products/categories?per_page=100&qa='+Date.now());
    report.wpCategories=sourceCategories.map(c=>({id:c.id,parent:c.parent,name:c.name,slug:c.slug})).filter(c=>c.parent===1775||c.id===1775);
    console.log('HOME02_CATEGORY_WP='+JSON.stringify(report.wpCategories));
    for(const [tag,path] of [
      ['native','/wp-json/wp/v2/product_cat?parent=1775&per_page=100&hide_empty=false'],
      ['custom','/wp-json/api/products/categories']
    ]){
      try{
        const response=await page.request.get(WP+path,{timeout:20000});
        const body=response.ok()?await response.json():null;
        const tree=Array.isArray(body)?body:Array.isArray(body?.data)?body.data:[];
        const out=[];
        const walk=(rows,parent=null)=>{for(const x of rows){
          if(x.id===1775 || x.parent===1775 || parent===1775)out.push({
            id:x.id,name:x.name,slug:x.slug,parent:x.parent,link:x.link||x.url||null,children:x.children?.length||0
          });
          if(Array.isArray(x.children))walk(x.children,x.id);
        }};
        walk(tree);
        report['category_'+tag]={status:response.status(),topLevel:tree.length,nodes:out};
      }catch(error){report['category_'+tag]={error:String(error)}}
    }
    console.log('HOME02_CATEGORY_SOURCES='+JSON.stringify({native:report.category_native,custom:report.category_custom}));
    try {
      const all=await request(WP+'/wp-json/wp/v2/product_cat?per_page=100&hide_empty=false');
      report.previousTerms=all.filter(c=>[1779,1780].includes(c.id))
        .map(c=>({id:c.id,name:c.name,parent:c.parent,slug:c.slug,link:c.link,count:c.count}));
    }catch(e){report.previousTermsError=String(e)}
    if(width===1440){
      report.routes=[];
      for(const pathname of [
        '/chihiros','/product-category/nen-cho-be-thuy-sinh/chihiros/',
        '/san-pham/nen-cho-be-thuy-sinh/chihiros/',
        '/danh-muc-san-pham/nen-cho-be-thuy-sinh/chihiros/',
        '/nen-cho-be-thuy-sinh/chihiros/'
      ]){
        try{
          const r=await page.request.get(ROOT+pathname,{timeout:15000});
          report.routes.push({pathname,status:r.status(),url:r.url(),title:(await r.text()).match(/<title>([^<]*)<\/title>/i)?.[1]||''});
        }catch(e){report.routes.push({pathname,error:String(e)})}
      }
      console.log('HOME02_ARCHIVE_ROUTES='+JSON.stringify(report.routes));
    }
    const nativeSlugs=(report.category_native?.nodes||[])
      .filter(c=>c.parent===1775).map(c=>c.slug).sort();
    const links=await menu.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
    const renderedSlugs=links.map(link=>new URL(link,ROOT).pathname.split('/').filter(Boolean).at(-1)).sort();
    assert.equal(nativeSlugs.length,7,'Native Nền terms unexpectedly changed');
    assert.deepEqual(renderedSlugs,nativeSlugs,'Sidebar must match real Nền child terms');
    assert.equal(await section.locator('[data-substrate-filter]').count(),0,'Obsolete filter button still exists');
    assert.equal(await section.getByText('Tất cả sản phẩm',{exact:true}).count(),0);
    assert.equal(await section.locator('.aqua-substrate-catalog__feature').count(),0,'Old sidebar image still exists');
    assert(links.every(x=>x&&x!=='#'&&!x.startsWith('javascript:')),'Invalid category link');
    if(width===1440){
      for(const href of links){
        const uri=new URL(href,ROOT);
        assert.equal(uri.origin,ROOT,'Category navigation leaves frontend');
        assert.equal(uri.pathname,'/san-pham/'+uri.pathname.split('/').filter(Boolean).at(-1),'Category must link to canonical SSR archive');
        const response=await page.request.get(uri.href,{timeout:25000});
        assert.equal(response.status(),200,'Product listing route unavailable: '+uri.href);
      }
      const archive=await ctx.newPage();
      await archive.goto(ROOT+'/san-pham/chihiros',{waitUntil:'domcontentloaded',timeout:45000});
      await archive.waitForFunction(()=>document.getElementById('product-page-title')?.textContent?.toLocaleLowerCase('vi').includes('chihiros'),null,{timeout:15000});
      assert.equal(await archive.locator('#main-content').count(),1,'Native Product SSR listing missing');
      report.archive={url:archive.url(),heading:await archive.locator('#product-page-title').textContent()};
      await archive.close();
    }
    const dimensions=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth}));
    assert(dimensions.doc<=dimensions.w+1,'Horizontal overflow at '+width+'px');
    await section.scrollIntoViewIfNeeded();
    const first=cards.first().locator('img');
    await first.evaluate(async img=>{await img.decode()});
    assert(await first.evaluate(img=>img.naturalWidth>0),'Broken actual product media');
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
