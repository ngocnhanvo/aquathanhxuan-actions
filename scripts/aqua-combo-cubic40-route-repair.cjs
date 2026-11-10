'use strict';
/** One-item source-verified WordPress native Rewrite repair. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const SOURCE='https://aquathanhxuan.com';
const WP='https://admin.aquathanhxuan.io.vn';
const SOURCE_ID=266939,TARGET_ID=82477,SLUG='combo-be-cubic-40-sieu-trong';
const FROM='^/san-pham/('+SLUG+')/?$';
const TO='/ssr/products/$1/detail';
const OUT='artifacts/aqua-combo-cubic40-rewrite';
fs.mkdirSync(OUT,{recursive:true});
const output={sourceId:SOURCE_ID,targetId:TARGET_ID,slug:SLUG,from:FROM,to:TO,scope:'one native Rewrite only',changes:[],status:'STARTED'};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(output,null,2)+'\n');
save();
async function main(){
 const original=await fetch(SOURCE+'/wp-json/wc/store/v1/products/'+SOURCE_ID,{signal:AbortSignal.timeout(30000)});
 assert.equal(original.status,200,'Source Product REST');
 const src=await original.json();
 assert.equal(src.id,SOURCE_ID,'Original Product ID changed');
 assert.equal(src.slug,SLUG,'Original slug changed');
 assert.equal(src.type,'simple','Unexpected original Product type');
 assert.equal(src.name,'Combo bể cubic 40 siêu trong','Original Product name changed');
 assert.equal(src.prices?.price,'2700000','Original price changed');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD,'Missing WordPress credential secret');
  const page=await browser.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nonce=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonce.status(),200,'WordPress REST nonce');
  const headers={'X-WP-Nonce':(await nonce.text()).trim()};
  const productResp=await page.request.get(WP+'/wp-json/wc/v3/products?status=publish&slug='+SLUG,{headers,timeout:35000});
  assert.equal(productResp.status(),200,'Published Woo Product lookup');
  const products=await productResp.json();
  assert.equal(products.length,1,'Exactly one published target Product');
  const product=products[0];
  assert.equal(product.id,TARGET_ID,'Target identity changed');
  assert.equal(product.slug,SLUG);
  assert.equal(product.type,'simple');
  assert.equal(product.price,src.prices.price,'Target/source price mismatch');
  const identity=(product.meta_data||[]).find(x=>x.key==='_esc_origin_product_id')?.value;
  assert.equal(String(identity),String(SOURCE_ID),'Target origin ID mismatch');
  const rules=[];
  for(let n=1;n<=20;n++){
   const response=await page.request.get(WP+'/wp-json/wp/v2/chuyen-huong-link?context=edit&status=any&per_page=100&page='+n,{headers,timeout:40000});
   if(response.status()===400)break;
   assert.equal(response.status(),200,'Rewrite registry lookup');
   const rows=await response.json();
   rules.push(...rows);
   if(rows.length<100)break;
  }
  const path='/san-pham/'+SLUG;
  const matches=rules.filter(r=>{
   const a=r.acf||{};
   if(r.status!=='publish'||!['Rewrite',301,302,307,308,'301','302','307','308'].includes(a.type)||![true,1,'1'].includes(a.enable))return false;
   const from=String(a.from_link||'');
   if(a.match_type==='Exact')return from===path||from===path+'/';
   if(a.match_type==='Wildcard'){
    try{return new RegExp('^'+from.split('*').map(s=>s.replace(/[^a-zA-Z0-9]/g,'\\$&')).join('.*')+'$').test(path)}catch{return false}
   }
   if(a.match_type==='Regex'){
    try{return new RegExp(from).test(path)}catch{return false}
   }
   return false;
  });
  assert(matches.length<=1,'Ambiguous existing Rewrite/Redirect matches '+JSON.stringify(matches.map(x=>x.id)));
  const exact=rules.filter(r=>String(r.acf?.from_link||'')===FROM);
  assert(exact.length<=1,'Duplicate native Rewrite');
  if(matches.length===1||exact.length===1){
   const existing=matches[0]||exact[0],a=existing.acf||{};
   assert.equal(existing.status,'publish');
   assert.equal(a.from_link,FROM,'Matching rule must be exactly source-verified');
   assert.equal(a.to_link,TO,'Destination route differs');
   assert.equal(a.type,'Rewrite');
   assert.equal(a.match_type,'Regex');
   assert([true,1,'1'].includes(a.enable),'Rule disabled');
   output.status='ALREADY_EXISTS';
   output.reused=existing.id;save();
   console.log('CUBIC40_REWRITE_REUSED='+existing.id);
   return;
  }
  await page.goto(WP+'/wp-admin/post-new.php?post_type=chuyen-huong-link',{waitUntil:'domcontentloaded',timeout:55000});
  await page.locator('#title').fill('Đường dẫn sản phẩm Combo bể cubic 40 siêu trong');
  await page.locator('[data-name="from_link"] input[type="text"]').fill(FROM);
  await page.locator('[data-name="to_link"] input[type="text"]').fill(TO);
  await page.locator('[data-name="type"] select').selectOption('Rewrite');
  await page.locator('[data-name="match_type"] select').selectOption('Regex');
  await page.locator('[data-name="enable"] input[type="checkbox"]').check();
  assert.equal(await page.locator('[data-name="from_link"] input[type="text"]').inputValue(),FROM,'WordPress input truncated');
  await page.locator('#publish').click();
  await page.waitForURL(url=>url.pathname.endsWith('/post.php')&&url.searchParams.has('post'),{timeout:50000});
  const id=Number(new URL(page.url()).searchParams.get('post'));
  assert(Number.isSafeInteger(id)&&id>0,'Published rule ID absent');
  const read=await page.request.get(WP+'/wp-json/wp/v2/chuyen-huong-link/'+id+'?context=edit',{headers,timeout:35000});
  assert.equal(read.status(),200,'Published rule readback');
  const rule=await read.json(),a=rule.acf||{};
  assert.equal(rule.status,'publish');
  assert.equal(a.from_link,FROM);
  assert.equal(a.to_link,TO);
  assert.equal(a.match_type,'Regex');
  assert.equal(a.type,'Rewrite');
  assert([true,1,'1'].includes(a.enable));
  output.changes.push({createdNativeRewrite:id});
  output.status='PASS';save();
  console.log('CUBIC40_REWRITE_PASS='+JSON.stringify({id,sourceId:SOURCE_ID,targetId:TARGET_ID,from:FROM,to:TO,writeScope:1}));
 }finally{await browser.close();}
}
main().catch(e=>{output.status='FAIL';output.error=String(e.stack||e).slice(0,2500);save();console.error('CUBIC40_REWRITE_FAILED='+output.error);process.exitCode=1});
