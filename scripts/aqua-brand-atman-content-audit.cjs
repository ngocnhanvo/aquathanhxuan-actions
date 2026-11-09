'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const SRC='https://aquathanhxuan.com';
const WP='https://admin.aquathanhxuan.io.vn';
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage();await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
if(await page.locator('#user_login').count()){
 await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
 await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
 await page.locator('#wp-submit').click();
}
await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
const nonceRes=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
assert.equal(nonceRes.status(),200);const nonce=(await nonceRes.text()).trim();
const resp=await page.request.get(WP+'/wp-json/wc/v3/products?category=1793&status=publish&per_page=100',{headers:{'X-WP-Nonce':nonce},timeout:35000});assert.equal(resp.status(),200);
const target=await resp.json();
const r=await fetch(SRC+'/wp-json/wc/store/v1/products?category=2162&per_page=100',{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);
const source=await r.json();
const bySlug=new Map(target.map(x=>[x.slug,x]));
const results=[];
for(const s of source){
const t=bySlug.get(s.slug);assert(t,'Atman target missing '+s.slug);
const result={slug:s.slug,id:s.id,
 sourceDescriptionBytes:String(s.description||'').length,
 targetDescriptionBytes:String(t.description||'').length,
 sourceShortBytes:String(s.short_description||'').length,
 targetShortBytes:String(t.short_description||'').length,
 sourceImages:(s.images||[]).length,targetImages:(t.images||[]).length
};results.push(result);
}
console.log('ATMAN_CONTENT_AUDIT='+JSON.stringify({count:results.length,results}));
}finally{await browser.close()}
})().catch(e=>{console.error('ATMAN_CONTENT_AUDIT_FAIL='+e.stack);process.exitCode=1});
