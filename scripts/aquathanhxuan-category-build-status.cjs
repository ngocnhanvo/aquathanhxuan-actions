'use strict';
const {chromium}=require('playwright');
const wp='https://admin.aquathanhxuan.io.vn';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage();
 await page.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
 if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
 }
 await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
 await page.goto(wp+'/wp-admin/admin.php?page=vcs-build-trigger',{waitUntil:'domcontentloaded',timeout:40000});
 await page.waitForTimeout(1300);
 const result=await page.evaluate(()=>({
   active:Boolean(window.vcsBuild?.initial_active),
   pending:Number(window.vcsBuild?.pending_count||0),
   configured:Boolean(window.vcsBuild?.build_configured),
   statusIcon:document.querySelector('#vcs-status-icon')?.textContent?.trim(),
   statusText:document.querySelector('#vcs-status-text')?.textContent?.trim(),
   mainButtonDisabled:document.querySelector('#vcs-build-btn-main')?.disabled,
   message:document.querySelector('.notice-error,.notice-warning')?.textContent?.trim()?.slice(0,500)
 }));
 console.log('AQUA_WP_BUILD_STATUS='+JSON.stringify(result));
 const endpoint='https://aquathanhxuan.io.vn/aquathanhxuan-staging-build.json?qa='+Date.now();
 const r=await fetch(endpoint,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
 console.log('AQUA_PUBLIC_BUILD_MARKER='+JSON.stringify({http:r.status,marker:r.ok?await r.json():undefined}));
 }finally{await browser.close()}
})().catch(e=>{console.error('AQUA_STATUS_READ_FAIL='+e.stack);process.exitCode=1});
