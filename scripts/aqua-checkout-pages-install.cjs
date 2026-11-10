'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn', OUT='artifacts/aqua-checkout-pages';
fs.mkdirSync(OUT,{recursive:true});
const pages=[
 {slug:'cart',title:'Giỏ hàng',key:'ssr-cart',action:'CartPage'},
 {slug:'checkout',title:'Thanh toán',key:'ssr-checkout',action:'CheckoutPage'},
 {slug:'order-received',title:'Đơn hàng đã đặt',key:'ssr-checkoutdone',action:'CheckoutDonePage'}
];
const routes=pages.map(p=>({from:'^/'+p.slug+'/?$',to:'/ssr/cart/'+p.slug}));
const report={scope:'CREATE_OR_VERIFY 3 specific Pages and 3 Rewrite records ONLY',pages:[],routes:[],created:[],status:'STARTED'};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(report,null,2)+'\n');
const has=val=>[true,1,'1'].includes(val);
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WordPress login secrets');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let page,headers;
 try{
  page=await browser.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nonce=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonce.status(),200,'Nonce HTTP');
  headers={'X-WP-Nonce':(await nonce.text()).trim()};
  async function read(url){
   const r=await page.request.get(WP+url,{headers,timeout:35000});
   assert.equal(r.status(),200,'WordPress GET '+url+' HTTP '+r.status());
   return r.json();
  }
  async function write(method,url,body){
   const r=await page.request.fetch(WP+url,{method,headers:{...headers,'Content-Type':'application/json'},data:body,timeout:45000});
   const raw=await r.text();
   assert(r.ok(),method+' '+url+' HTTP '+r.status()+' '+raw.slice(0,260));
   return JSON.parse(raw);
  }
  // Never change pre-existing Page content/ACF. Existing records must match.
  for(const spec of pages){
   const rows=await read('/wp-json/wp/v2/pages?slug='+spec.slug+'&status=any&context=edit');
   assert(Array.isArray(rows)&&rows.length<=1,'Ambiguous existing Page '+spec.slug);
   let item=rows[0];
   if(!item){
    item=await write('POST','/wp-json/wp/v2/pages',{title:spec.title,slug:spec.slug,status:'draft',
       acf:{key:spec.key,action:spec.action,product_lang:'vi'}});
    report.created.push({kind:'page',id:item.id,slug:spec.slug});save();
   }
   const full=await read('/wp-json/wp/v2/pages/'+item.id+'?context=edit');
   assert.equal(full.slug,spec.slug,'Wrong Page slug');
   assert.equal(full.acf?.key,spec.key,'Page key field not saved');
   assert.equal(full.acf?.action,spec.action,'Page action field not saved');
   if(full.status!=='publish'){
    assert(report.created.some(x=>x.kind==='page'&&x.id===item.id),
      'Existing unpublished Page; refusing to repurpose '+spec.slug);
    await write('POST','/wp-json/wp/v2/pages/'+item.id,{status:'publish'});
   }
   report.pages.push({id:item.id,slug:spec.slug,key:spec.key,action:spec.action});save();
  }

  const registry=[];
  for(let n=1;n<=20;n++){
   const r=await page.request.get(WP+'/wp-json/wp/v2/chuyen-huong-link?context=edit&status=any&per_page=100&page='+n,{headers,timeout:35000});
   if(r.status()===400)break;
   assert.equal(r.status(),200,'Rewrite pagination');
   const batch=await r.json();registry.push(...batch);
   if(batch.length<100)break;
  }
  for(const rule of routes){
   const others=registry.filter(r=>String(r.acf?.from_link||'')===rule.from);
   assert(others.length<=1,'Duplicate native Rewrite '+rule.from);
   if(others.length===1){
    const r=others[0],a=r.acf||{};
    assert.equal(r.status,'publish');
    assert.equal(a.type,'Rewrite');
    assert.equal(a.match_type,'Regex');
    assert.equal(a.to_link,rule.to);
    assert(has(a.enable));
    report.routes.push({id:r.id,...rule,reused:true});save();
    continue;
   }
   // ACF UI uses the same publishing code as prior verified Product Rewrite #83801.
   await page.goto(WP+'/wp-admin/post-new.php?post_type=chuyen-huong-link',{waitUntil:'domcontentloaded',timeout:55000});
   await page.locator('#title').fill('Định tuyến mua hàng: '+rule.from);
   await page.locator('[data-name="from_link"] input[type="text"]').fill(rule.from);
   await page.locator('[data-name="to_link"] input[type="text"]').fill(rule.to);
   await page.locator('[data-name="type"] select').selectOption('Rewrite');
   await page.locator('[data-name="match_type"] select').selectOption('Regex');
   await page.locator('[data-name="enable"] input[type="checkbox"]').check();
   await page.locator('#publish').click();
   await page.waitForURL(u=>u.pathname.endsWith('/post.php')&&u.searchParams.has('post'),{timeout:45000});
   const id=Number(new URL(page.url()).searchParams.get('post'));
   assert(Number.isSafeInteger(id)&&id>0,'New Rewrite ID');
   report.created.push({kind:'rewrite',id});save();
   const got=await read('/wp-json/wp/v2/chuyen-huong-link/'+id+'?context=edit');
   const a=got.acf||{};
   assert.equal(got.status,'publish');
   assert.equal(a.from_link,rule.from);
   assert.equal(a.to_link,rule.to);
   assert.equal(a.type,'Rewrite');
   assert.equal(a.match_type,'Regex');
   assert(has(a.enable));
   report.routes.push({id,...rule,reused:false});save();
  }
  report.status='PASS';save();
  console.log('AQUA_CHECKOUT_PAGES_PASS='+JSON.stringify({pages:report.pages,routes:report.routes}));
 }finally{await browser.close();}
})().catch(e=>{report.status='FAIL';report.error=String(e.stack||e).slice(0,1200);save();console.error('AQUA_CHECKOUT_PAGES_FAIL='+report.error);process.exitCode=1;});
