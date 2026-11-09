'use strict';
/** Idempotent, CMS-owned Regex Rewrites for *verified* original product slugs. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const SOURCE='https://aquathanhxuan.com',WP='https://admin.aquathanhxuan.io.vn';
const GROUPS={
  'brand-a':['thuong-hieu-chihiros','continuum-aquatics','thuong-hieu-dennerle','eheim'],
  'brand-b':['thuong-hieu-gex','ista','jebao','jecod-thuong-hieu'],
  'brand-c':['moutaintree','jbl','neo','nuphar','prodac-italia'],
  'brand-d':['prodibio','seachem','sera','sobo','week-aqua']
};
const EXPECTED={'brand-a':33,'brand-b':36,'brand-c':41,'brand-d':38};
const OUTPUT='artifacts/brand-product-routes';
fs.mkdirSync(OUTPUT,{recursive:true});
const report={source:SOURCE,target:WP,sourceRootId:2019,targetRootId:1767,expectedTotal:148,results:[],status:'STARTED'};
const save=()=>fs.writeFileSync(OUTPUT+'/result.json',JSON.stringify(report,null,2)+'\n');
save();
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
async function sourceGet(url){
 let err;
 for(let i=0;i<4;i++){
  try{
    const r=await fetch(url,{signal:AbortSignal.timeout(25000)});
    if(!r.ok)throw Error('HTTP '+r.status+' '+url);
    return await r.json();
  }catch(e){err=e;if(i<3)await new Promise(resolve=>setTimeout(resolve,600*(i+1)))}
 }
 throw err;
}
async function sourcePages(endpoint,category){
 const rows=[];
 for(let p=1;p<=25;p++){
  const sep=endpoint.includes('?')?'&':'?';
  const data=await sourceGet(SOURCE+endpoint+sep+'per_page=100&page='+p+(category?'&category='+category:''));
  assert(Array.isArray(data));
  rows.push(...data);
  if(data.length<100)break;
 }
 return rows;
}
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'CMS login secrets unavailable');
 const sourceCats=await sourcePages('/wp-json/wc/store/v1/products/categories');
 const sourceBrands=sourceCats.filter(x=>Number(x.parent)===2019);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  page.setDefaultTimeout(22000);
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const n=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(n.status(),200);
  const nonce=(await n.text()).trim();
  const headers={'X-WP-Nonce':nonce};
  const catR=await page.request.get(WP+'/wp-json/wc/v3/products/categories?per_page=100',{headers,timeout:45000});
  assert.equal(catR.status(),200);
  const targetCats=await catR.json();
  const allDestSlugs=new Set(targetCats.map(x=>x.slug));
  const targetBrands=targetCats.filter(x=>Number(x.parent)===1767);
  const scopes=[];
  const allProductSlugs=new Set();
  for(const [batch,slugs] of Object.entries(GROUPS)){
    const fetched=[];
    for(const slug of slugs){
      const matches=targetBrands.filter(x=>x.slug===slug);
      assert.equal(matches.length,1,'Target brand slug not found '+slug);
      const category=matches[0];
      const srcMatches=sourceBrands.filter(x=>norm(x.name)===norm(category.name));
      assert.equal(srcMatches.length,1,'Source brand identity ambiguous '+category.name);
      const sourceProducts=await sourcePages('/wp-json/wc/store/v1/products',srcMatches[0].id);
      for(const item of sourceProducts){
       assert(item.type==='simple','Unsupported source product '+item.slug);
       assert(/^[a-z0-9-]+$/.test(item.slug),'Unexpected source product slug '+item.slug);
       assert(!allDestSlugs.has(item.slug),'Product slug would intercept category '+item.slug);
       assert(!allProductSlugs.has(item.slug),'Product in multiple route groups '+item.slug);
       allProductSlugs.add(item.slug);
       fetched.push(item.slug);
      }
    }
    assert.equal(fetched.length,EXPECTED[batch],'Source product count changed '+batch);
    scopes.push({batch,from:'^/san-pham/('+fetched.join('|')+')/?$',to:'/ssr/products/$1/detail',count:fetched.length});
  }
  assert.equal(allProductSlugs.size,148,'Verified original brand product count changed');
  console.log('BRAND_ROUTE_SOURCE_PREFLIGHT='+JSON.stringify(scopes.map(x=>({batch:x.batch,count:x.count,expressionLength:x.from.length}))));
  // Do not create any route until all imported WooCommerce products exist with same slugs.
  for(const scope of scopes){
    const slugs=scope.from.slice('^/san-pham/('.length,-')/?$'.length).split('|');
    for(const slug of slugs){
      const r=await page.request.get(WP+'/wp-json/wc/v3/products?status=publish&slug='+encodeURIComponent(slug),{headers,timeout:35000});
      assert.equal(r.status(),200,'Cannot verify target Product '+slug);
      const list=await r.json();
      assert.equal(list.length,1,'Product not ready for Rewrite '+slug);
    }
  }
  const rulesR=await page.request.get(WP+'/wp-json/wp/v2/chuyen-huong-link?context=edit&status=any&per_page=100',{headers,timeout:35000});
  assert.equal(rulesR.status(),200);
  const previous=await rulesR.json();
  assert(Array.isArray(previous));
  for(const rule of scopes){
    const existed=previous.filter(r=>String(r.acf?.from_link||'')===rule.from);
    assert(existed.length<=1,'Ambiguous existing Rewrite '+rule.batch);
    if(existed.length){
      const r=existed[0];
      assert.equal(r.acf?.to_link,rule.to,'Existing Rewrite target changed');
      assert.equal(r.acf?.type,'Rewrite');
      assert.equal(r.acf?.match_type,'Regex');
      assert(r.acf?.enable===true||r.acf?.enable===1||r.acf?.enable==='1');
      report.results.push({batch:rule.batch,id:r.id,count:rule.count,status:'reused'});
      save();
      continue;
    }
    await page.goto(WP+'/wp-admin/post-new.php?post_type=chuyen-huong-link',{waitUntil:'domcontentloaded',timeout:50000});
    await page.locator('#title').fill('Đường dẫn sản phẩm thương hiệu '+rule.batch);
    await page.locator('[data-name="from_link"] input[type="text"]').fill(rule.from);
    await page.locator('[data-name="to_link"] input[type="text"]').fill(rule.to);
    await page.locator('[data-name="type"] select').selectOption('Rewrite');
    await page.locator('[data-name="match_type"] select').selectOption('Regex');
    await page.locator('[data-name="enable"] input[type="checkbox"]').check();
    const checked=await page.locator('[data-name="from_link"] input').inputValue();
    assert.equal(checked,rule.from,'Regex truncated by CMS form');
    await page.locator('#publish').click();
    await page.waitForURL(u=>u.pathname.endsWith('/post.php')&&u.searchParams.has('post'),{timeout:45000});
    const id=Number(new URL(page.url()).searchParams.get('post'));
    assert(id>0,'Cannot determine new WordPress Rewrite ID');
    const readback=await page.request.get(WP+'/wp-json/wp/v2/chuyen-huong-link/'+id+'?context=edit',{headers,timeout:35000});
    assert.equal(readback.status(),200);
    const stored=await readback.json();
    assert.equal(stored.acf?.from_link,rule.from,'WordPress truncated persisted Rewrite');
    assert.equal(stored.acf?.to_link,rule.to);
    assert.equal(stored.acf?.type,'Rewrite');
    assert.equal(stored.acf?.match_type,'Regex');
    assert(stored.acf?.enable===true||stored.acf?.enable===1||stored.acf?.enable==='1');
    assert.equal(stored.status,'publish');
    report.results.push({batch:rule.batch,id,count:rule.count,status:'created'});
    console.log('BRAND_ROUTE_CREATED='+JSON.stringify(report.results.at(-1)));save();
  }
  report.status='PASS';save();
  console.log('BRAND_PRODUCT_ROUTING_PASS='+JSON.stringify(report.results));
 }finally{await browser.close()}
})().catch(e=>{
 report.status='FAIL';report.error=String(e.stack||e);save();
 console.error('BRAND_PRODUCT_ROUTING_FAIL='+report.error);process.exitCode=1;
});
