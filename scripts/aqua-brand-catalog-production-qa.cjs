'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const SOURCE='https://aquathanhxuan.com';
const WP='https://admin.aquathanhxuan.io.vn';
const FRONT='https://aquathanhxuan.io.vn';
const cfg=JSON.parse(fs.readFileSync('qa-requests/brand-catalog-production.json','utf8'));
assert(/^[0-9a-f]{40}$/.test(cfg.sha||''),'Exact commit SHA required for production QA');
const out='artifacts/brand-catalog-qa';
fs.mkdirSync(out,{recursive:true});
const summary={sha:cfg.sha,date:new Date().toISOString(),categories:[],screenshots:[],status:'STARTED'};
function persist(){fs.writeFileSync(out+'/summary.json',JSON.stringify(summary,null,2)+'\n')}
persist();
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'')}
const pause=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function sourceJson(path){
 let err;
 for(let tryNo=0;tryNo<4;tryNo++){
  try{
   const res=await fetch(SOURCE+path,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});
   if(!res.ok)throw Error('SOURCE HTTP '+res.status+' '+path);
   const rows=await res.json();
   assert(Array.isArray(rows),'Unexpected source JSON rows');
   return rows;
  }catch(e){err=e;if(tryNo<3)await pause(600*(tryNo+1))}
 }
 throw err;
}
async function categoryPages(root,slug){
 const rows=[];
 for(let page=1;page<=20;page++){
  const sep=root.includes('?')?'&':'?';
  const received=await sourceJson(root+sep+'per_page=100&page='+page+(slug?'&category='+slug:''));
  rows.push(...received);
  if(received.length<100)break;
 }
 return rows;
}
(async()=>{
 const markerDeadline=Date.now()+8*60*1000;
 let marker='';
 while(Date.now()<markerDeadline){
  try{
    const res=await fetch(FRONT+'/aquathanhxuan-staging-build.json?stamp='+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(18000)});
    if(res.ok){const data=await res.json();marker=String(data.commit||'');if(marker===cfg.sha)break}
  }catch(e){marker=String(e)}
  console.log('BRAND_QA_DEPLOY_WAIT='+JSON.stringify({expected:cfg.sha,actual:marker}).slice(0,300));
  await pause(12000);
 }
 assert.equal(marker,cfg.sha,'Deployed frontend commit did not match expected SHA');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const cms=await browser.newPage();
  await cms.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await cms.locator('#user_login').count()){
    await cms.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
    await cms.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
    await cms.locator('#wp-submit').click();
  }
  await cms.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nonceR=await cms.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceR.status(),200);
  const nonce=(await nonceR.text()).trim();
  const headers={'X-WP-Nonce':nonce};
  async function targetJson(path){
    let err;
    for(let i=0;i<4;i++){
      try{
        const response=await cms.request.get(WP+path,{headers,timeout:35000});
        assert.equal(response.status(),200,'Target WP HTTP status '+path);
        const data=await response.json();
        assert(Array.isArray(data),'Invalid target WC list');
        return data;
      }catch(e){err=e;if(i<3)await pause(800*(i+1))}
    }
    throw err;
  }
  async function allTarget(path){
    const items=[];
    for(let page=1;page<=30;page++){
      const rows=await targetJson(path+(path.includes('?')?'&':'?')+'per_page=100&page='+page);
      items.push(...rows);
      if(rows.length<100)break;
    }
    return items;
  }
  const srcCats=await categoryPages('/wp-json/wc/store/v1/products/categories');
  const dstCats=await allTarget('/wp-json/wc/v3/products/categories');
  const sourceParents=srcCats.filter(x=>x.slug==='thuong-hieu');
  const destParents=dstCats.filter(x=>x.slug==='thuong-hieu');
  assert.equal(sourceParents.length,1);assert.equal(destParents.length,1);
  const srcBrands=srcCats.filter(x=>Number(x.parent)===Number(sourceParents[0].id));
  const dstBrands=dstCats.filter(x=>Number(x.parent)===Number(destParents[0].id));
  assert.equal(dstBrands.length,20,'Target WordPress must have 20 menu brand categories');
  const oracle={};
  const allPublicProductSlugs=new Set();
  for(const category of dstBrands){
    const source=srcBrands.find(x=>norm(x.name)===norm(category.name));
    if(!source){
      assert.equal(category.name,'FKSC','Unexpected missing source brand category '+category.name);
      // Legacy header FKSC points to /danh-muc/may-loc/may-loc-fksc/; verified empty.
      const current=await allTarget('/wp-json/wc/v3/products?category='+category.id+'&status=publish');
      assert.equal(current.length,0,'Legacy FKSC is empty, target should remain empty');
      summary.categories.push({name:category.name,dstSlug:category.slug,sourceCount:0,targetCount:0});
      console.log('BRAND_QA_CATEGORY_PASS='+JSON.stringify(summary.categories.at(-1)));persist();continue;
    }
    const sourceRows=await categoryPages('/wp-json/wc/store/v1/products',source.id);
    const targetRows=await allTarget('/wp-json/wc/v3/products?category='+category.id+'&status=publish');
    const bySlug=new Map(targetRows.map(p=>[p.slug,p]));
    assert.equal(bySlug.size,targetRows.length,'Target product slugs not unique '+category.name);
    assert.equal(targetRows.length,sourceRows.length,'CMS count mismatch '+category.name);
    for(const product of sourceRows){
      allPublicProductSlugs.add(product.slug);
      const target=bySlug.get(product.slug);
      assert(target,'Missing '+category.name+' product '+product.slug);
      const orig=(target.meta_data||[]).find(x=>x.key==='_esc_origin_product_id');
      assert.equal(String(orig?.value||''),String(product.id),'Legacy source ID mismatch '+product.slug);
      const srcPrice=String(product.prices?.price||'');
      assert.equal(String(target.price),srcPrice,'Price mismatch '+product.slug);
      // Two source problems independently confirmed in read-only run 42584424951:
      // ISTA Product 3178: the sole WordPress original plus every srcset size
      // returns HTTP 404 on the legacy site (verified attachment 266663).
      // JECOD Product 15280: Woo Store API includes one extra image whose basename
      // collides with unrelated target image; the legacy public detail itself
      // displays only the other three original images.
      if(Number(product.id)===184){
        assert.equal(product.slug,'seachem-matrix-0-5','Seachem source asset exception identity changed');
        assert.equal(target.images.length,0,'Do not fabricate missing Seachem image');
        summary.sourceMediaDeferred=(summary.sourceMediaDeferred||[]).concat([{sourceId:184,slug:product.slug,missing:'legacy-original-and-all-derivatives-404'}]);
      }else if(Number(product.id)===3178){
        assert.equal(product.slug,'su-ista-active-bio-pearl','ISTA source asset exception identity changed');
        assert.equal(target.images.length,0,'Do not fabricate missing ISTA image');
        summary.sourceMediaDeferred=(summary.sourceMediaDeferred||[]).concat([{sourceId:3178,slug:product.slug,missing:'legacy-original-404'}]);
      }else if(Number(product.id)===15280){
        assert.equal(product.slug,'bom-jecod-fa-1000','JECOD source asset exception identity changed');
        const filenames=['62.png','Thiet-ke-chua-co-ten-2024-05-18T153204.687.png','Thiet-ke-chua-co-ten-2024-05-18T153852.528.png'];
        assert.equal(target.images.length,3,'Only legacy public JECOD three-item gallery may be copied');
        assert.deepEqual(target.images.map(x=>decodeURIComponent(String(x.src||'').split('/').pop())),filenames,'JECOD page gallery image identity');
        summary.sourceMediaDeferred=(summary.sourceMediaDeferred||[]).concat([{sourceId:15280,slug:product.slug,missing:'source-store-only-extra-image-filename-conflict'}]);
      }else{
        assert(target.images.length>0,'Missing target media '+product.slug);
        assert(target.images.length>=(product.images||[]).filter(x=>x.src).length,
          'Missing source image/gallery media '+product.slug);
      }
      assert(target.images.every(image=>String(image.src||'').includes('/wp-content/uploads/')&&!String(image.src||'').startsWith(SOURCE)),
        'Media hotlink or missing original asset '+product.slug);
      if(String(product.description||'').trim())assert(String(target.description||'').trim(),'Original description missing '+product.slug);
      if(String(product.short_description||'').trim())assert(String(target.short_description||'').trim(),'Original short description missing '+product.slug);
      assert(target.categories.some(c=>Number(c.id)===Number(category.id)),'Broken target category link '+product.slug);
    }
    summary.categories.push({name:category.name,srcSlug:source.slug,dstSlug:category.slug,sourceCount:sourceRows.length,targetCount:targetRows.length});
    oracle[category.slug]=new Map(sourceRows.map(p=>[p.slug,Number(p.prices?.price||0)]));
    console.log('BRAND_QA_CATEGORY_PASS='+JSON.stringify(summary.categories.at(-1)));persist();
  }
  // Validate every public Product detail permalink, not just one sample.
  // Three concurrent reads keep production load bounded.
  const routeContext=await browser.newContext();
  const publicSlugs=[...allPublicProductSlugs];
  let cursor=0;
  const routeWorker=async()=>{
    for(;;){
      const index=cursor++;
      if(index>=publicSlugs.length)return;
      const slug=publicSlugs[index];
      const href=FRONT+'/san-pham/'+encodeURIComponent(slug);
      let response;
      for(let attempt=0;attempt<2;attempt++){
        response=await routeContext.request.get(href,{timeout:30000,failOnStatusCode:false});
        if(response.status()!==502&&response.status()!==503&&response.status()!==504)break;
        if(attempt===0)await pause(700);
      }
      assert.equal(response.status(),200,'Broken public Product permalink '+href);
    }
  };
  try{await Promise.all(Array.from({length:3},()=>routeWorker()))}
  finally{await routeContext.close()}
  console.log('BRAND_QA_ALL_PRODUCT_LINKS_PASS='+publicSlugs.length);

  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
    const page=await context.newPage();
    // Independent source visual baseline, same viewport as the target screenshots.
    for(const sourceSlug of ['chihiros','dennerle','seachem']){
      const sourcePage=await context.newPage();
      const response=await sourcePage.goto(SOURCE+'/danh-muc/thuong-hieu/'+sourceSlug+'/',{waitUntil:'domcontentloaded',timeout:60000});
      assert.equal(response.status(),200,'Source Brand visual baseline HTTP '+sourceSlug);
      const filename=out+'/source-'+sourceSlug+'-'+width+'.png';
      await sourcePage.screenshot({path:filename,fullPage:true});
      summary.screenshots.push(filename);
      await sourcePage.close();
    }
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    for(const category of dstBrands){
      const href='/san-pham/'+category.slug;
      const expected=oracle[category.slug]||new Map();
      const observed=new Map();
      const pages=Math.max(1,Math.ceil(expected.size/16));
      for(let n=1;n<=pages;n++){
        const url=href+(n===1?'':'/'+n);
        const response=await page.goto(FRONT+url,{waitUntil:'domcontentloaded',timeout:60000});
        assert.equal(response.status(),200,'Brand listing public HTTP 200 '+url);
        assert.equal(await page.locator('h1#product-page-title').count(),1,'Missing category H1 '+url);
        const products=await page.locator('[data-catalog-product]').evaluateAll(nodes=>nodes.map(card=>{
          const link=card.querySelector('a[href^="/san-pham/"]')?.getAttribute('href')||'';
          return {slug:link.split('/').filter(Boolean).pop(),price:Number(card.getAttribute('data-catalog-product-price')||0),link};
        }));
        for(const x of products){
          assert(!observed.has(x.slug),'Duplicate card '+x.slug+' category '+category.slug);
          observed.set(x.slug,x.price);
        }
        const seo=await page.evaluate(()=>({
          description:document.querySelector('meta[name="description"]')?.content||'',
          schema:[...document.querySelectorAll('script[type="application/ld+json"]')].map(n=>n.textContent||'').join(''),
          overflow:document.documentElement.scrollWidth-innerWidth
        }));
        assert(!seo.description.includes('[table')&&!seo.schema.includes('[table'),'Editor shortcode leaked to SEO '+url);
        assert(seo.overflow<=2,'Horizontal overflow '+url+' @ '+width+' '+seo.overflow);
        if(n===1&&['thuong-hieu-chihiros','continuum-aquatics','thuong-hieu-dennerle','seachem','may-loc-fksc'].includes(category.slug)){
          const file=out+'/'+category.slug+'-'+width+'.png';
          await page.screenshot({path:file,fullPage:true});
          summary.screenshots.push(file);
        }
      }
      assert.equal(observed.size,expected.size,'Frontend product count mismatch '+category.slug+' '+width);
      for(const [slug,price] of expected){
        assert(observed.has(slug),'Frontend product missing '+category.slug+'/'+slug+' '+width);
        assert.equal(observed.get(slug),price,'Frontend product price mismatch '+category.slug+'/'+slug);
      }
      console.log('BRAND_QA_FRONTEND_PASS='+JSON.stringify({slug:category.slug,width,count:expected.size}));persist();
    }
    // Business actions must work on real products, not only on the first static SSR payload.
    await page.goto(FRONT+'/san-pham/thuong-hieu-chihiros',{waitUntil:'domcontentloaded'});
    const link=await page.locator('[data-catalog-product] a[href^="/san-pham/"]').first().getAttribute('href');
    assert(link&&link.startsWith('/san-pham/'),'Chihiros public product route absent');
    const detail=await page.goto(FRONT+link,{waitUntil:'domcontentloaded'});
    assert.equal(detail.status(),200,'Chihiros detail redirect must work');
    const detailSlug=link.split('/').filter(Boolean).at(-1);
    const expectedDetailPrice=oracle['thuong-hieu-chihiros']?.get(detailSlug);
    assert(Number.isFinite(expectedDetailPrice) && expectedDetailPrice>0,'Chihiros source price unavailable');
    const renderedPrice=await page.locator('#data-content-wrapper h3.text-signal-red').first().innerText();
    assert(renderedPrice.includes(new Intl.NumberFormat('vi-VN').format(expectedDetailPrice)),
      'WooCommerce detail must display true current price, not domain registration price: '+link);
    await page.waitForFunction(()=>Object.keys(localStorage).some(key=>key.includes('recent-products')),{timeout:8000});
    await page.goto(FRONT+'/san-pham/thuong-hieu-chihiros',{waitUntil:'domcontentloaded'});
    await page.locator('#recently-viewed-list a').first().waitFor({state:'attached',timeout:12000});
    await page.goto(FRONT+'/san-pham/thuong-hieu-dennerle?sort=price-asc',{waitUntil:'domcontentloaded'});
    const ascending=await page.locator('[data-catalog-product-price]').evaluateAll(nodes=>nodes.map(x=>Number(x.getAttribute('data-catalog-product-price'))));
    assert.deepEqual(ascending,[...ascending].sort((a,b)=>a-b),'Dennerle sorting ascending');
    await page.goto(FRONT+'/san-pham/thuong-hieu-dennerle?sort=price-desc',{waitUntil:'domcontentloaded'});
    const descending=await page.locator('[data-catalog-product-price]').evaluateAll(nodes=>nodes.map(x=>Number(x.getAttribute('data-catalog-product-price'))));
    assert.deepEqual(descending,[...descending].sort((a,b)=>b-a),'Dennerle sorting descending');
    for(const missingImageSlug of ['su-ista-active-bio-pearl','seachem-matrix-0-5']){
      const detailResponse=await page.goto(FRONT+'/san-pham/'+missingImageSlug,{waitUntil:'domcontentloaded',timeout:60000});
      assert.equal(detailResponse.status(),200,'Source image-deferred Product permalink '+missingImageSlug);
      assert.equal(await page.locator('#product-main-image').getAttribute('src'),'/placeholders/product.webp',
        'Render deliberate local placeholder for 404 legacy media '+missingImageSlug);
    }
    assert.equal(errors.length,0,'JavaScript browser errors '+JSON.stringify(errors));
    await context.close();
    console.log('BRAND_QA_VIEWPORT_PASS='+width);
  }
  summary.status='PASS_WITH_SOURCE_MEDIA_DEFERRED';persist();
  console.log('BRAND_CATALOG_PRODUCTION_PARITY_PARTIAL_MEDIA='+JSON.stringify({
    sourceProducts:summary.categories.reduce((v,x)=>v+x.sourceCount,0),
    categories:summary.categories.length,viewports:[1440,390],screenshots:summary.screenshots.length,
    sourceMediaDeferred:[184,3178,15280],deployedSha:cfg.sha
  }));
 }finally{await browser.close()}
})().catch(e=>{
  summary.status='FAIL';summary.error=String(e.stack||e);persist();
  console.error('BRAND_CATALOG_PRODUCTION_PARITY_FAIL='+summary.error);process.exitCode=1;
});
