'use strict';
/** Read-only independent source WooCommerce -> target WooCommerce -> production Astro QA.
 * Source payload and HTML SEO, never the importer manifest, are the acceptance oracle.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const SOURCE='https://aquathanhxuan.com';
const TARGET='https://admin.aquathanhxuan.io.vn';
const PUBLIC='https://aquathanhxuan.io.vn';
const DATA_ONLY=process.env.AQUA_QA_DATA_ONLY==='1';
const CONFIG=JSON.parse(fs.readFileSync(process.env.AQUA_QA_REQUEST_PATH||'qa-requests/remaining-catalog-production.json','utf8'));
assert(/^[0-9a-f]{40}$/.test(CONFIG.sha),'Expected pinned Astro source SHA');
const directory='artifacts/aqua-remaining-catalog-production';
fs.mkdirSync(directory,{recursive:true});
const report={source:SOURCE,target:TARGET,production:PUBLIC,revision:CONFIG.sha,mode:DATA_ONLY?'DATA_ONLY':'PRODUCTION',checks:[],categories:[],errors:[],status:'STARTED',time:new Date().toISOString()};
const save=()=>fs.writeFileSync(directory+'/report.json',JSON.stringify(report,null,2)+'\n');
save();
const roots=[
 ['Máy lọc','may-loc',1809,1769],
 ['Vật liệu lọc','vat-lieu-loc',1003,1770],
 ['Phụ kiện','phu-kien',2012,1771],
 ['Đá / Lũa / Cát','da-lua-va-cat',1994,1772],
 ['Hóa chất','thuoc-xu-ly-van-de',2057,1773],
 ['Bể kính','be-kinh-va-chan',909,1774],
 ['Nền','nen-cho-be-thuy-sinh',972,1775],
 ['CO2','co2',1105,1776],
 ['Sinh vật','cay-va-ca-thuy-sinh',618,1777],
];
const sleep=t=>new Promise(ok=>setTimeout(ok,t));
async function retryRead(label,task){
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await task();
   const status=typeof response.status==='function'?response.status():response.status;
   if([429,500,502,503,504].includes(status)&&attempt<3){
    console.log('AQUA_REMAINING_QA_RETRY='+JSON.stringify({label,attempt,status}));
    await sleep(attempt*900);continue;
   }
   assert.equal(status,200,label+' HTTP '+status);
   return response;
  }catch(error){
   if(attempt===3||!/ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|fetch failed|network|TimeoutError|ECONNREFUSED/i.test(String(error)))throw error;
   console.log('AQUA_REMAINING_QA_RETRY='+JSON.stringify({label,attempt,error:String(error).slice(0,160)}));
   await sleep(attempt*900);
  }
 }
 throw Error('READ_RETRIES_EXHAUSTED '+label);
}
async function original(url){
 const response=await retryRead('Original '+url,()=>fetch(SOURCE+url,{signal:AbortSignal.timeout(45000),headers:{'cache-control':'no-cache'}}));
 return response.json();
}
async function paged(get,url,limit=100){
 const output=[];
 for(let page=1;page<=limit;page++){
  const rows=await get(url+(url.includes('?')?'&':'?')+'per_page=100&page='+page);
  assert(Array.isArray(rows),'Expected list '+url);
  output.push(...rows);
  if(rows.length<100)return output;
 }
 throw Error('Pagination too large: '+url);
}
const norm=value=>String(value||'').replace(/<[^>]*>/g,' ')
 .replace(/&(?:amp|#38);/gi,'&').replace(/&(?:nbsp|#160);/gi,' ')
 .replace(/&(?:quot|#34);/gi,'"').replace(/&(?:apos|#39);/gi,"'")
 .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
 .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
 .normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase('vi');
async function main(){
 if(!DATA_ONLY){
  let actual='';
  const deadline=Date.now()+120000;
  while(Date.now()<deadline){
   try{
    const r=await fetch(PUBLIC+'/aquathanhxuan-staging-build.json?qa='+Date.now(),{signal:AbortSignal.timeout(15000),headers:{'cache-control':'no-cache'}});
    if(r.ok){
     const j=await r.json();
     actual=j.commit||'';
     if(j.branch==='master'&&actual===CONFIG.sha)break;
    }
   }catch(e){console.log('AQUA_REMAINING_MARKER_RETRY='+String(e).slice(0,120))}
   await sleep(9000);
  }
  assert.equal(actual,CONFIG.sha,'Deployment not updated to requested source');
  console.log('AQUA_REMAINING_DEPLOY_READY='+CONFIG.sha);
 }
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const auth=await browser.newPage();
  await auth.goto(TARGET+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await auth.locator('#user_login').count()){
   await auth.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await auth.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await auth.locator('#wp-submit').click();
  }
  await auth.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:60000});
  const nonceR=await auth.request.get(TARGET+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceR.status(),200,'WP authorized nonce unavailable');
  const headers={'X-WP-Nonce':(await nonceR.text()).trim()};
  assert(headers['X-WP-Nonce'].length>5);
  async function woo(url){
   const r=await retryRead('Target '+url,()=>auth.request.get(TARGET+url,{headers,timeout:45000}));
   return r.json();
  }
  const [sourceTerms,targetTerms,targetProducts]=await Promise.all([
   paged(original,'/wp-json/wc/store/v1/products/categories',30),
   paged(woo,'/wp-json/wc/v3/products/categories',30),
   paged(woo,'/wp-json/wc/v3/products?status=publish&orderby=id&order=asc',150),
  ]);
  const targetBySlug=new Map();
  const seenTargetIds=new Set();
  let repeatedPageRows=0;
  for(const p of targetProducts){
   assert(Number.isInteger(Number(p.id))&&p.slug,'Invalid target Product ID or slug');
   if(seenTargetIds.has(Number(p.id))){
    const previous=targetBySlug.get(p.slug);
    assert(previous&&Number(previous.id)===Number(p.id),'Conflicting target Product slug '+p.slug);
    repeatedPageRows++;
    continue;
   }
   seenTargetIds.add(Number(p.id));
   const previous=targetBySlug.get(p.slug);
   assert(!previous || Number(previous.id)===Number(p.id),
     'Different target Product IDs own same slug '+p.slug+': '+previous?.id+' vs '+p.id);
   targetBySlug.set(p.slug,p);
  }
  console.log('AQUA_REMAINING_TARGET_PAGING='+JSON.stringify({
    fetched:targetProducts.length,uniqueIds:seenTargetIds.size,duplicatesAcrossPages:repeatedPageRows,
  }));
  const sourceTermToTarget=new Map();
  for(const [,targetSlug,sourceId,targetId] of roots){
   assert(sourceTerms.some(c=>Number(c.id)===sourceId&&Number(c.parent||0)===0),'Original root changed '+sourceId);
   assert(targetTerms.some(c=>Number(c.id)===targetId&&c.slug===targetSlug&&Number(c.parent||0)===0),'Target root changed '+targetSlug);
   sourceTermToTarget.set(sourceId,targetId);
  }
  for(const cat of sourceTerms){
   const parent=Number(cat.parent||0);
   if(!sourceTermToTarget.has(parent))continue;
   const tid=sourceTermToTarget.get(parent);
   const matches=targetTerms.filter(x=>Number(x.parent||0)===tid&&(x.slug===cat.slug||norm(x.name)===norm(cat.name)));
   assert.equal(matches.length,1,'Missing or ambiguous destination child '+cat.slug);
   sourceTermToTarget.set(Number(cat.id),Number(matches[0].id));
  }
  const originalById=new Map();
  const samples=[];
  for(const [name,slug,sourceId,targetId] of roots){
   const rows=await paged(original,'/wp-json/wc/store/v1/products?category='+sourceId,100);
   report.categories.push({name,slug,sourceId,targetId,sourceCount:rows.length});
   assert(rows.length>0,'Source root empty '+slug);
   samples.push({name,slug,product:rows[0],expectedTargetIds:rows.map(src=>targetBySlug.get(src.slug)?.id).filter(Boolean)});
   for(const product of rows){
    const old=originalById.get(Number(product.id));
    if(old)assert.equal(old.slug,product.slug,'Original Product source-id collision');
    originalById.set(Number(product.id),product);
   }
   console.log('AQUA_REMAINING_CATEGORY_SOURCE_PASS='+JSON.stringify({slug,count:rows.length}));
  }
  assert.equal(originalById.size,389,'Original nine-menu product scope changed');
  const selectedBatches=process.env.AQUA_QA_BATCHES?.trim()
   ?new Set(process.env.AQUA_QA_BATCHES.split(',').map(value=>Number(value.trim()))):null;
  if(selectedBatches){
   assert(DATA_ONLY,'A partial-batch audit must never be called production QA');
   assert([...selectedBatches].every(n=>Number.isInteger(n)&&n>=0&&n<13),'Invalid QA batch scope');
  }
  const auditProducts=[...originalById.values()].filter(src=>
   !selectedBatches||selectedBatches.has(Number(src.id)%13));
  assert(auditProducts.length>0,'No source Product selected for QA');
  console.log('AQUA_REMAINING_AUDIT_SOURCE_SCOPE='+JSON.stringify({all:originalById.size,auditing:auditProducts.length,batches:selectedBatches?[...selectedBatches]:null}));
  // Two original Gebo UV Products are category-less at source and therefore
  // excluded from the 389 verified root listings. The exact source IDs and
  // their manually mapped WP child are independently verified in #42666557375.
  // Skip only for scoped early audits, not for full DATA_ONLY / production.
  const specialProducts=[
   {id:5054,slug:'den-uv-30w',categoryIds:[1771,1835]},
   {id:4355,slug:'den-uv-40w',categoryIds:[1771,1835]},
  ];
  if(!selectedBatches){
   for(const spec of specialProducts){
    const src=await original('/wp-json/wc/store/v1/products/'+spec.id);
    assert.equal(Number(src.id),spec.id);
    assert.equal(src.slug,spec.slug);
    assert.equal(src.type,'simple');
    assert.equal((src.categories||[]).length,0,'Special UV source taxonomy has changed');
    const dst=targetBySlug.get(spec.slug);
    assert(dst,'Exact original UV Product not yet imported '+spec.slug);
    const origin=(dst.meta_data||[]).find(x=>x.key==='_esc_origin_product_id');
    assert.equal(String(origin?.value||''),String(spec.id),'Special UV Product provenance mismatch '+spec.slug);
    assert.equal(String(dst.price||''),String(src.prices?.price||''),'Special UV price mismatch '+spec.slug);
    assert.equal(String(dst.regular_price||''),String(src.prices?.regular_price||''),'Special UV regular price mismatch '+spec.slug);
    assert.equal(dst.stock_status,src.is_in_stock?'instock':'outofstock','Special UV stock mismatch '+spec.slug);
    assert(spec.categoryIds.every(id=>(dst.categories||[]).some(c=>Number(c.id)===id)),
       'Special UV Product missing verified menu category '+spec.slug);
   }
   const bonsai=targetBySlug.get('cay-bonsai-to');
   assert(bonsai,'Exact original Bonsai Product missing');
   const bonsaiOrigin=(bonsai.meta_data||[]).find(x=>x.key==='_esc_origin_product_id');
   assert.equal(String(bonsaiOrigin?.value||''),'3321','Bonsai identity mismatch');
   assert([1772,1839,1841].every(id=>(bonsai.categories||[]).some(c=>Number(c.id)===id)),
       'Bonsai must retain original Đá plus verified submenu category');
   console.log('AQUA_REMAINING_SPECIAL_SOURCE_MAPPING_PASS='+JSON.stringify({uvProducts:2,bonsai:1}));
  }
  const originalBySlug=new Map();
  let deferred=0;
  for(const src of auditProducts){
   assert(src.type==='simple'&&src.slug&&src.name,'Invalid original source Product');
   assert(!originalBySlug.has(src.slug),'Original Product slug collision '+src.slug);
   originalBySlug.set(src.slug,src);
   const dst=targetBySlug.get(src.slug);
   assert(dst,'WordPress missing Product '+src.slug);
   const origin=(dst.meta_data||[]).find(x=>x.key==='_esc_origin_product_id');
   assert.equal(String(origin?.value||''),String(src.id),'Product provenance mismatch '+src.slug);
   assert.equal(norm(dst.name),norm(src.name),'Product title mismatch '+src.slug);
   assert.equal(String(dst.price||''),String(src.prices?.price||''),'Sale/current price mismatch '+src.slug);
   assert.equal(String(dst.regular_price||''),String(src.prices?.regular_price||''),'Regular price mismatch '+src.slug);
   assert.equal(dst.stock_status,src.is_in_stock?'instock':'outofstock','Inventory state mismatch '+src.slug);
   assert.equal(dst.status,'publish','Target Product is not published '+src.slug);
   assert.notEqual(dst.catalog_visibility,'hidden','Source storefront Product is hidden on destination '+src.slug);
   for(const c of src.categories||[]){
    const expected=sourceTermToTarget.get(Number(c.id));
    if(!expected)continue;
    assert((dst.categories||[]).some(x=>Number(x.id)===expected),'Product missing mapped category '+src.slug+' '+c.id);
   }
   if(!(dst.images||[]).length){
    assert((dst.meta_data||[]).some(x=>x.key==='_esc_source_media_deferred'&&String(x.value||'').trim()),'Missing cover with no verified exception '+src.slug);
    deferred++;
   }
   if(src.description?.trim())assert(dst.description?.trim(),'Missing long description '+src.slug);
   if(src.short_description?.trim())assert(dst.short_description?.trim(),'Missing short description '+src.slug);
  }
  console.log('AQUA_REMAINING_WOO_PARITY_PASS='+JSON.stringify({unique:auditProducts.length,scopeTotal:originalById.size,roots:roots.length,mediaDeferred:deferred}));
  // HTML head remains an independent SEO source. Validate the selected set in controlled batches.
  const all=auditProducts;
  let seoTitles=0,seoDescriptions=0,missingTitles=0,missingDescriptions=0;
  for(let i=0;i<all.length;i+=5){
   const chunk=all.slice(i,i+5);
   const heads=await Promise.all(chunk.map(async src=>{
    const path='/san-pham/'+encodeURIComponent(src.slug)+'/';
    const r=await retryRead('Source HTML '+src.slug,()=>fetch(SOURCE+path,{signal:AbortSignal.timeout(45000),headers:{'cache-control':'no-cache'}}));
    return (await r.text()).split('</head>')[0];
   }));
   const meta=await auth.evaluate(heads=>heads.map(head=>{
    const doc=new DOMParser().parseFromString(head+'</head>','text/html');
    return {title:String(doc.querySelector('title')?.textContent||'').replace(/\s+/g,' ').trim(),
     description:String(doc.querySelector('meta[name="description"]')?.getAttribute('content')||'').replace(/\s+/g,' ').trim()};
   }),heads);
   for(let k=0;k<chunk.length;k++){
    const src=chunk[k],dst=targetBySlug.get(src.slug),m=meta[k];
    const value=key=>String((dst.meta_data||[]).find(x=>x.key===key)?.value||'').replace(/\s+/g,' ').trim();
    if(m.title){assert.equal(value('_yoast_wpseo_title'),m.title,'Yoast source title mismatch '+src.slug);seoTitles++}else missingTitles++;
    if(m.description){assert.equal(value('_yoast_wpseo_metadesc'),m.description,'Yoast source description mismatch '+src.slug);seoDescriptions++}else missingDescriptions++;
   }
   if(i%50===0)console.log('AQUA_REMAINING_SEO_PROGRESS='+JSON.stringify({checked:Math.min(i+5,all.length),total:all.length}));
  }
  console.log('AQUA_REMAINING_SEO_PARITY_PASS='+JSON.stringify({total:all.length,seoTitles,seoDescriptions,missingTitles,missingDescriptions}));
  report.woo={total:all.length,rootCount:roots.length,mediaDeferred:deferred,seoTitles,seoDescriptions,missingTitles,missingDescriptions};
  save();
  if(DATA_ONLY){
   report.status='DATA_PASS';save();
   console.log('AQUA_REMAINING_DATA_QA_PASS='+all.length);
   return;
  }
  for(const width of [1440,390]){
   const ctx=await browser.newContext({viewport:{width,height:width===390?844:900}});
   const tab=await ctx.newPage();
   const errors=[];
   tab.on('pageerror',e=>errors.push(String(e.message)));
   for(const {name,slug,sourceId,product,expectedTargetIds} of samples){
    const categoryPath='/san-pham/'+slug;
    const res=await tab.goto(PUBLIC+categoryPath,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(res?.status(),200,'Category public HTTP '+categoryPath);
    await tab.locator('article[data-catalog-product]').first().waitFor({state:'visible',timeout:15000});
    const cardCount=await tab.locator('article[data-catalog-product]').count();
    assert(cardCount>0,'Empty category '+slug);
    const renderedIds=await tab.locator('article[data-catalog-product]').evaluateAll(nodes=>
      nodes.map(node=>Number(node.getAttribute('data-catalog-product'))));
    assert(renderedIds.every(id=>Number.isInteger(id)&&id>0),'Card missing WooCommerce Product ID '+slug);
    const acceptable=new Set(expectedTargetIds.map(Number));
    assert(renderedIds.every(id=>acceptable.has(id)),'Category contains Product outside verified original source '+slug);
    assert.equal(new Set(renderedIds).size,renderedIds.length,'Repeated Product card in category '+slug);
    const overflow=await tab.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
    assert(overflow<=3,'Category horizontal overflow '+slug+' '+width);
    const screenshot='category-'+slug+'-'+width+'.png';
    await tab.screenshot({path:directory+'/'+screenshot,fullPage:false});
    report.checks.push({type:'category',slug,width,cardCount,overflow,http:res.status(),screenshot});
    console.log('AQUA_REMAINING_CATEGORY_UI_PASS='+JSON.stringify({slug,width,cards:cardCount}));
    const productPath='/san-pham/'+product.slug;
    const detail=await tab.goto(PUBLIC+productPath,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(detail?.status(),200,'Product detail route HTTP '+productPath);
    const title=(await tab.locator('h1').first().innerText()).trim();
    const expected=await tab.evaluate(html=>{
     const doc=new DOMParser().parseFromString(html,'text/html');
     return doc.body.textContent.trim();
    },String(product.name||''));
    assert.equal(norm(title),norm(expected),'Product detail H1 mismatch '+product.slug);
    const dOverflow=await tab.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
    assert(dOverflow<=3,'Product detail horizontal overflow '+product.slug+' '+width);
    const shot='detail-'+product.slug+'-'+width+'.png';
    await tab.screenshot({path:directory+'/'+shot,fullPage:false});
    report.checks.push({type:'detail',slug:product.slug,sourceId:product.id,width,h1:title,overflow:dOverflow,http:detail.status(),screenshot:shot});
    console.log('AQUA_REMAINING_DETAIL_UI_PASS='+JSON.stringify({slug:product.slug,width,sourceId:product.id}));
    save();
   }
   // Explicit source-backed UV items and Cây Bonsai belong to menu child
   // categories; verify their real public detail links as well.
   for(const spec of [...specialProducts,{id:3321,slug:'cay-bonsai-to'}]){
    const path='/san-pham/'+spec.slug;
    const response=await tab.goto(PUBLIC+path,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(response?.status(),200,'Special source Product URL '+path);
    const heading=await tab.locator('h1').first().innerText();
    assert(heading.trim().length>2,'Special source Product H1 empty '+spec.slug);
    const overflow=await tab.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
    assert(overflow<=3,'Special Product overflow '+spec.slug+' '+width);
    const filename='detail-special-'+spec.slug+'-'+width+'.png';
    await tab.screenshot({path:directory+'/'+filename,fullPage:false});
    report.checks.push({type:'special-detail',slug:spec.slug,sourceId:spec.id,width,h1:heading,overflow,screenshot:filename});
    console.log('AQUA_REMAINING_SPECIAL_DETAIL_PASS='+JSON.stringify({slug:spec.slug,width,sourceId:spec.id}));
    save();
   }
   assert.deepEqual(errors,[],'Browser Javascript errors '+width);
   await ctx.close();
  }
  assert.equal(report.checks.length,42,'Expected nine roots, nine root Products and three verified special Products across two viewports');
  report.status='PASS';
  save();
  console.log('AQUA_REMAINING_PRODUCTION_QA_PASS='+JSON.stringify({products:originalById.size,checks:report.checks.length,seoTitles,seoDescriptions,mediaDeferred:deferred}));
 }finally{await browser.close()}
}
main().catch(e=>{report.status='FAILED';report.errors.push(String(e.stack||e).slice(0,3000));save();console.error('AQUA_REMAINING_PRODUCTION_QA_FAILED='+String(e.stack||e).slice(0,3000));process.exitCode=1});
