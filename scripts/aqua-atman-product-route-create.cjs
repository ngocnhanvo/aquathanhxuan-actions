'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const origin='https://admin.aquathanhxuan.io.vn';
const productSlugs=[
 'may-sui-khi-atman-hp-12000','may-suc-khi-atman-hp-40000',
 'may-suc-khi-atman-hp-8000','suoi-rs-508','atman-at-106s',
 'atman-at-104s','atman-at-306s','atman-at-305s','atman-at-304s'
];
assert.equal(new Set(productSlugs).size,9,'Source Atman slug identity changed');
const from='^/san-pham/('+productSlugs.join('|')+')/?$';
const to='/ssr/products/$1/detail';
const journal={status:'STARTED',writeScope:['one WordPress chuyen-huong-link record'],from,to};
fs.mkdirSync('artifacts/atman-route',{recursive:true});
const save=()=>fs.writeFileSync('artifacts/atman-route/result.json',JSON.stringify(journal,null,2)+'\n');
let browser,createdId=null,verified=false,page,nonce='';
const valid=(record)=>{
 const acf=record?.acf||{};
 assert.equal(record?.status,'publish','Route not published');
 assert.equal(acf.from_link,from,'Route source modified');
 assert.equal(acf.to_link,to,'Route target modified');
 assert.equal(acf.type,'Rewrite','Route must be internal rewrite');
 assert.equal(acf.match_type,'Regex','Route match type incorrect');
 assert(acf.enable===true || acf.enable===1 || acf.enable==='1','Route not enabled');
};
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WP login');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 page=await browser.newPage();
 page.on('dialog',async dialog=>{if(['beforeunload','confirm'].includes(dialog.type()))await dialog.accept();else await dialog.dismiss()});
 await page.goto(origin+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
 if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
 }
 await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:40000});
 const nonceRes=await page.request.get(origin+'/wp-admin/admin-ajax.php?action=rest-nonce');
 assert.equal(nonceRes.status(),200);
 nonce=(await nonceRes.text()).trim();assert(nonce&&nonce!=='-1');
 const headers={'X-WP-Nonce':nonce,'Cache-Control':'no-cache','Accept':'application/json'};
 const list=await page.request.get(origin+'/wp-json/wp/v2/chuyen-huong-link?context=edit&status=any&per_page=100',{headers,timeout:30000});
 assert.equal(list.status(),200,'Route preflight REST failed');
 const existing=await list.json();
 assert(Array.isArray(existing),'Invalid redirects response');
 const candidates=existing.filter(x=>(x.acf?.from_link||'')===from);
 assert(candidates.length<=1,'Ambiguous matching route');
 assert(existing.every(x=>x.id===candidates[0]?.id || (x.acf?.to_link||'')!==to),'Conflicting existing target');
 if(candidates.length){
   valid(candidates[0]);
   journal.ruleId=candidates[0].id;
   console.log('ATMAN_ROUTE_ALREADY_EXISTS='+candidates[0].id);
 }else{
   await page.goto(origin+'/wp-admin/post-new.php?post_type=chuyen-huong-link',{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('#title').fill('Đường dẫn chi tiết sản phẩm ATMAN');
   await page.locator('[data-name="from_link"] input[type="text"]').fill(from);
   await page.locator('[data-name="to_link"] input[type="text"]').fill(to);
   await page.locator('[data-name="type"] select').selectOption('Rewrite');
   await page.locator('[data-name="match_type"] select').selectOption('Regex');
   await page.locator('[data-name="enable"] input[type="checkbox"]').check();
   const form=await page.evaluate(()=>Object.fromEntries(['from_link','to_link','type','match_type','enable'].map(key=>{
      const root=document.querySelector('[data-name="'+key+'"]');
      const element=key==='enable'?root?.querySelector('input[type="checkbox"]'):root?.querySelector('input,select');
      return [key,key==='enable'?element?.checked:element?.value];
   })));
   assert.deepEqual(form,{from_link:from,to_link:to,type:'Rewrite',match_type:'Regex',enable:true},'Native ACF draft invalid');
   await page.locator('#publish').click();
   await page.waitForURL(u=>u.pathname.endsWith('/post.php')&&u.searchParams.has('post'),{timeout:45000});
   createdId=Number(new URL(page.url()).searchParams.get('post'));
   assert(Number.isSafeInteger(createdId)&&createdId>0,'Published route ID missing');
   journal.ruleId=createdId;journal.created=true;save();
 }
 const id=journal.ruleId;
 const recordR=await page.request.get(origin+'/wp-json/wp/v2/chuyen-huong-link/'+id+'?context=edit&cache='+Date.now(),{headers,timeout:30000});
 assert.equal(recordR.status(),200,'Cannot read saved redirect');
 const record=await recordR.json();
 valid(record);
 journal.status='PASS';journal.finishedAt=new Date().toISOString();save();
 verified=true;
 console.log('ATMAN_ROUTE_CMS_PASS='+JSON.stringify({id,created:!!createdId,from,to,status:record.status}));
})().catch(e=>{
 journal.status='FAIL';journal.error=String(e.stack||e);save();
 console.error('ATMAN_ROUTE_CMS_FAIL='+journal.error);process.exitCode=1;
}).finally(async()=>{
 if(!verified&&createdId&&nonce&&page){
  try{
   const res=await page.request.post(origin+'/wp-json/wp/v2/chuyen-huong-link/'+createdId,{headers:{'X-WP-Nonce':nonce,'Content-Type':'application/json'},data:{status:'trash'},timeout:20000});
   journal.rollbackStatus=res.status();journal.rolledBack=res.ok();save();
   console.log('ATMAN_ROUTE_ROLLBACK='+JSON.stringify({id:createdId,status:res.status()}));
  }catch(e){console.error('ATMAN_ROUTE_ROLLBACK_FAIL='+String(e))}
 }
 await browser?.close().catch(()=>{});
});
