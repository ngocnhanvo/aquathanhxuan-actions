'use strict';
/** Install ONE permanent WordPress CMS Page and ONE rewrite for order history.
 * The Astro component already exists: OrderHistoryPage.astro.
 * Never create or modify Woo customers, orders, coupons or shipping settings.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const OUT='artifacts/aqua-order-history-page';
fs.mkdirSync(OUT,{recursive:true});
const expected={slug:'lich-su-mua-hang',title:'Lịch sử mua hàng',
 key:'ssr-order-history',action:'OrderHistoryPage'};
const route={from:'^/lich-su-mua-hang/?$',to:'/ssr/cart/lich-su-mua-hang'};
const report={scope:'One WP published Page + one native WP Rewrite only',
 status:'STARTED',page:null,rewrite:null,writes:[],created_orders:0,created_accounts:0};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(report,null,2)+'\n');
const bool=v=>[true,1,'1'].includes(v);
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,
  'Missing WordPress admin credentials');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:50000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nr=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:15000});
  assert.equal(nr.status(),200,'WP REST nonce read');
  const headers={'X-WP-Nonce':(await nr.text()).trim()};
  async function read(path){
   const res=await page.request.get(WP+path,{headers,timeout:30000});
   const raw=await res.text();
   assert(res.ok(),'GET '+path+' HTTP '+res.status()+' '+raw.slice(0,200));
   return JSON.parse(raw);
  }
  async function write(path,body){
   const res=await page.request.post(WP+path,{headers:{...headers,'Content-Type':'application/json'},data:body,timeout:40000});
   const raw=await res.text();
   assert(res.ok(),'POST '+path+' HTTP '+res.status()+' '+raw.slice(0,230));
   return JSON.parse(raw);
  }
  // Read ALL existing WordPress Pages (including unpublished) to avoid
  // conflicting the known Astro OrderHistoryPage Action/key with another Page.
  const all=[];
  for(let n=1;n<=30;n++){
   const res=await page.request.get(WP+'/wp-json/wp/v2/pages?status=any&context=edit&per_page=100&page='+n,
    {headers,timeout:30000});
   if(res.status()===400)break;
   assert.equal(res.status(),200,'WP Pages inventory HTTP '+res.status());
   const batch=await res.json();assert(Array.isArray(batch),'WP Pages inventory shape');
   all.push(...batch);
   if(batch.length<100)break;
  }
  const matched=all.filter(p=>p.slug===expected.slug ||
    p.acf?.action===expected.action ||
    p.acf?.key===expected.key);
  assert(matched.length<=1,'Existing order history Page is ambiguous');
  let item=matched[0];
  if(item){
   assert.equal(item.slug,expected.slug,'OrderHistoryPage exists on another slug; manual review');
   assert.equal(item.acf?.key,expected.key,'Existing order history Page has different key');
   assert.equal(item.acf?.action,expected.action,'Existing order history Page has wrong action');
   assert.equal(item.status,'publish','Existing unpublished order history Page; refusing to repurpose');
  }else{
   item=await write('/wp-json/wp/v2/pages',{
    title:expected.title,slug:expected.slug,status:'draft',
    acf:{key:expected.key,action:expected.action,product_lang:'vi'}
   });
   report.writes.push({kind:'new WordPress Page draft',id:item.id});
   save();
   const checked=await read('/wp-json/wp/v2/pages/'+item.id+'?context=edit');
   assert.equal(checked.slug,expected.slug);
   assert.equal(checked.acf?.key,expected.key);
   assert.equal(checked.acf?.action,expected.action);
   await write('/wp-json/wp/v2/pages/'+item.id,{status:'publish'});
   report.writes.push({kind:'publish verified WordPress Page',id:item.id});
  }
  const full=await read('/wp-json/wp/v2/pages/'+item.id+'?context=edit');
  assert.equal(full.status,'publish');
  assert.equal(full.slug,expected.slug);
  assert.equal(full.acf?.key,expected.key);
  assert.equal(full.acf?.action,expected.action);
  report.page={id:full.id,slug:full.slug,status:full.status,key:full.acf.key,
   action:full.acf.action};save();

  // Use the same vetted native Rewrite post editor flow as the 3 working
  // cart/checkout/receipt routes; never add a fallback in Astro.
  const registry=[];
  for(let n=1;n<=20;n++){
   const res=await page.request.get(WP+'/wp-json/wp/v2/chuyen-huong-link?context=edit&status=any&per_page=100&page='+n,
    {headers,timeout:30000});
   if(res.status()===400)break;
   assert.equal(res.status(),200,'WP rewrite inventory HTTP '+res.status());
   const batch=await res.json();assert(Array.isArray(batch),'WP rewrite inventory shape');
   registry.push(...batch);
   if(batch.length<100)break;
  }
  const candidate=registry.filter(r=>String(r.acf?.from_link||'')===route.from);
  assert(candidate.length<=1,'Duplicate order history Rewrite records');
  if(candidate.length){
   const r=candidate[0],acf=r.acf||{};
   assert.equal(r.status,'publish');
   assert.equal(acf.to_link,route.to);
   assert.equal(acf.type,'Rewrite');
   assert.equal(acf.match_type,'Regex');
   assert(bool(acf.enable));
   report.rewrite={id:r.id,from:route.from,to:route.to,reused:true};
  }else{
   await page.goto(WP+'/wp-admin/post-new.php?post_type=chuyen-huong-link',
    {waitUntil:'domcontentloaded',timeout:55000});
   await page.locator('#title').fill('Định tuyến lịch sử mua hàng Aqua');
   await page.locator('[data-name="from_link"] input[type="text"]').fill(route.from);
   await page.locator('[data-name="to_link"] input[type="text"]').fill(route.to);
   await page.locator('[data-name="type"] select').selectOption('Rewrite');
   await page.locator('[data-name="match_type"] select').selectOption('Regex');
   await page.locator('[data-name="enable"] input[type="checkbox"]').check();
   await page.locator('#publish').click();
   await page.waitForURL(url=>url.pathname.endsWith('/post.php')&&url.searchParams.has('post'),
    {timeout:45000});
   const id=Number(new URL(page.url()).searchParams.get('post'));
   assert(Number.isSafeInteger(id)&&id>0,'Cannot determine Rewrite ID');
   report.writes.push({kind:'native WordPress Rewrite',id});save();
   const got=await read('/wp-json/wp/v2/chuyen-huong-link/'+id+'?context=edit');
   assert.equal(got.status,'publish');
   assert.equal(got.acf?.from_link,route.from);
   assert.equal(got.acf?.to_link,route.to);
   assert.equal(got.acf?.type,'Rewrite');
   assert.equal(got.acf?.match_type,'Regex');
   assert(bool(got.acf?.enable));
   report.rewrite={id,from:route.from,to:route.to,reused:false};
  }
  report.status='PASS';save();
  console.log('AQUA_ORDER_HISTORY_WP_PAGE_PASS='+JSON.stringify({
   page:report.page,rewrite:report.rewrite,writes:report.writes,created_orders:0,created_accounts:0
  }));
 }finally{await browser.close()}
})().catch(err=>{report.status='FAIL';report.error=String(err?.stack||err).slice(0,1200);
 save();console.error('AQUA_ORDER_HISTORY_WP_PAGE_FAIL='+report.error);process.exitCode=1;});
