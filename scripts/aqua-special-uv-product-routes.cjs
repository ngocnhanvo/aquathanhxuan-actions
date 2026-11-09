'use strict';
/** Native WP rewrite for exactly two verified categoryless Gebo UV Products. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const SOURCE='https://aquathanhxuan.com';
const WP='https://admin.aquathanhxuan.io.vn';
const OUT='artifacts/aqua-special-uv-routes';
fs.mkdirSync(OUT,{recursive:true});
const report={source:SOURCE,target:WP,expectedProducts:2,rootSlug:'den-uv',sourceIds:[5054,4355],routes:[],status:'STARTED'};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(report,null,2)+'\n');
save();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function sourceJson(url){
 for(let i=0;i<4;i++){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(30000)});
   if(!r.ok)throw Error('SOURCE HTTP '+r.status);
   return await r.json();
  }catch(e){if(i===3)throw e;await pause(1000*(i+1))}
 }
}
async function wpGet(page,url,headers){
 for(let i=0;i<4;i++){
  try{
   const r=await page.request.get(url,{headers,timeout:40000});
   assert.equal(r.status(),200,'WP HTTP '+r.status()+' '+url);
   return await r.json();
  }catch(e){if(i===3)throw e;await pause(1000*(i+1))}
 }
}
async function pagedSource(url){
 let all=[];
 for(let n=1;n<=25;n++){
  const rows=await sourceJson(url+(url.includes('?')?'&':'?')+'per_page=100&page='+n);
  assert(Array.isArray(rows));
  all.push(...rows);
  if(rows.length<100)break;
 }
 return all;
}
async function pagedTarget(page,url,headers){
 let all=[];
 for(let n=1;n<=25;n++){
  const rows=await wpGet(page,url+(url.includes('?')?'&':'?')+'per_page=100&page='+n,headers);
  assert(Array.isArray(rows));
  all.push(...rows);
  if(rows.length<100)break;
 }
 return all;
}
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing approved WordPress CMS credentials');
 const verified=[[5054,'den-uv-30w','Đèn UV Gebo 30W'],[4355,'den-uv-40w','Đèn UV Gebo 40W']];
 const sourceProducts=[];
 for(const [id,slug,name] of verified){
  const p=await sourceJson(SOURCE+'/wp-json/wc/store/v1/products/'+id);
  assert.equal(Number(p.id),id);assert.equal(p.slug,slug);assert.equal(p.name,name);
  assert.equal(p.type,'simple');
  assert.equal((p.categories||[]).length,0,'Original source Product category identity changed');
  sourceProducts.push(p);
 }
 const allSlugs=sourceProducts.map(x=>x.slug);
 assert.equal(new Set(allSlugs).size,2,'Original UV Product scope changed');
 assert(allSlugs.every(slug=>/^[a-z0-9-]+$/.test(slug)),'Invalid original Product slug');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nonceR=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceR.status(),200,'Missing WordPress REST nonce');
  const headers={'X-WP-Nonce':(await nonceR.text()).trim()};
  assert(headers['X-WP-Nonce'].length>5,'Malformed nonce');
  const destCategories=await pagedTarget(page,WP+'/wp-json/wc/v3/products/categories',headers);
  assert(destCategories.some(x=>Number(x.id)===1771&&Number(x.parent||0)===0),'Target Phụ kiện root missing');
  assert(destCategories.some(x=>Number(x.id)===1835&&Number(x.parent||0)===1771),'Target Đèn UV child missing');
  const reserved=new Set(destCategories.map(x=>x.slug));
  for(const slug of allSlugs)assert(!reserved.has(slug),'Refusing to intercept category slug '+slug);
  // Every source Product and its own origin identity must exist in CMS before adding any Rewrite.
  for(const src of sourceProducts){
   assert(src.type==='simple','Unsupported Product type '+src.slug);
   const found=await wpGet(page,WP+'/wp-json/wc/v3/products?status=publish&per_page=100&slug='+encodeURIComponent(src.slug),headers);
   assert.equal(found.length,1,'Missing imported Product '+src.slug);
   const p=found[0];
   const oid=(p.meta_data||[]).find(m=>m.key==='_esc_origin_product_id');
   assert.equal(String(oid?.value||''),String(src.id),'Source Product identity mismatch '+src.slug);
   assert([1771,1835].every(id=>(p.categories||[]).some(x=>Number(x.id)===id)),'Missing target Đèn UV categories '+src.slug);
  }
  console.log('AQUA_SPECIAL_UV_ROUTE_TARGET_PRODUCTS_PASS='+allSlugs.length);
  const previous=await pagedTarget(page,WP+'/wp-json/wp/v2/chuyen-huong-link?context=edit&status=any',headers);
  function alreadyCovered(slug){
   const url='/san-pham/'+slug;
   return previous.some(rule=>{
    const acf=rule.acf||{};
    if(rule.status!=='publish'||acf.type!=='Rewrite'||acf.match_type!=='Regex'||![true,1,'1'].includes(acf.enable))return false;
    if(String(acf.to_link)!=='/ssr/products/$1/detail')return false;
    try{return new RegExp(String(acf.from_link||'')).test(url)}catch{return false}
   });
  }
  const needed=allSlugs.filter(slug=>!alreadyCovered(slug));
  report.needed=needed;
  console.log('AQUA_SPECIAL_UV_ROUTE_PREFLIGHT='+JSON.stringify({source:allSlugs.length,alreadyCovered:allSlugs.length-needed.length,needed:needed.length}));
  const groups=[];
  for(let i=0;i<needed.length;i+=25){
   const slugs=needed.slice(i,i+25);
   groups.push({from:'^/san-pham/('+slugs.join('|')+')/?$',to:'/ssr/products/$1/detail',slugs});
  }
  for(let i=0;i<groups.length;i++){
   const rule=groups[i];
   const matches=previous.filter(item=>item.acf?.from_link===rule.from);
   assert(matches.length<=1,'Duplicate exact rewrite');
   if(matches.length===1){
    const acf=matches[0].acf||{};
    assert.equal(acf.to_link,rule.to);
    assert.equal(acf.type,'Rewrite');
    assert.equal(acf.match_type,'Regex');
    assert.equal(matches[0].status,'publish','Matching Product Rewrite is not published');
    assert([true,1,'1'].includes(acf.enable),'Matching Product Rewrite is disabled');
    report.routes.push({id:matches[0].id,count:rule.slugs.length,status:'reused'});
    save();
    continue;
   }
   await page.goto(WP+'/wp-admin/post-new.php?post_type=chuyen-huong-link',{waitUntil:'domcontentloaded',timeout:55000});
   await page.locator('#title').fill('Đường dẫn sản phẩm đèn UV '+(i+1));
   await page.locator('[data-name="from_link"] input[type="text"]').fill(rule.from);
   await page.locator('[data-name="to_link"] input[type="text"]').fill(rule.to);
   await page.locator('[data-name="type"] select').selectOption('Rewrite');
   await page.locator('[data-name="match_type"] select').selectOption('Regex');
   await page.locator('[data-name="enable"] input[type="checkbox"]').check();
   assert.equal(await page.locator('[data-name="from_link"] input').inputValue(),rule.from);
   await page.locator('#publish').click();
   await page.waitForURL(u=>u.pathname.endsWith('/post.php')&&u.searchParams.has('post'),{timeout:45000});
   const id=Number(new URL(page.url()).searchParams.get('post'));
   assert(Number.isInteger(id)&&id>0,'Missing WP Rewrite ID');
   const check=await wpGet(page,WP+'/wp-json/wp/v2/chuyen-huong-link/'+id+'?context=edit',headers);
   assert.equal(check.status,'publish');
   assert.equal(check.acf?.from_link,rule.from);
   assert.equal(check.acf?.to_link,rule.to);
   assert.equal(check.acf?.type,'Rewrite');
   assert.equal(check.acf?.match_type,'Regex');
   assert([true,1,'1'].includes(check.acf?.enable));
   report.routes.push({id,count:rule.slugs.length,status:'created'});
   console.log('AQUA_SPECIAL_UV_ROUTE_CREATED='+JSON.stringify(report.routes.at(-1)));save();
  }
  report.status='PASS';save();
  console.log('AQUA_SPECIAL_UV_PRODUCT_ROUTING_PASS='+JSON.stringify({source:allSlugs.length,alreadyCovered:allSlugs.length-needed.length,createdRules:report.routes.length,neededSlugs:needed.length}));
 }finally{await browser.close()}
})().catch(e=>{report.status='FAIL';report.error=String(e.stack||e).slice(0,2500);save();console.error('AQUA_SPECIAL_UV_PRODUCT_ROUTING_FAIL='+report.error);process.exitCode=1});
