'use strict';
/** Read-only production QA: email dispatch and password updates are intercepted. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const ORIGIN='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-password-recovery';
fs.mkdirSync(OUT,{recursive:true});
async function test(){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    const page=await context.newPage();
    const home=await page.goto(ORIGIN+'/lich-su-mua-hang',{waitUntil:'domcontentloaded',timeout:50000});
    assert.equal(home.status(),200,'Account history should load');
    await page.locator('#login-form').waitFor({state:'visible',timeout:15000});
    console.log('RECOVERY_ACCOUNT_ANCHORS='+JSON.stringify(await page.locator('#login-form a').evaluateAll(links=>links.map(a=>({text:a.textContent?.trim(),path:a.getAttribute('href')})))));
    for(const slug of ['quen-mat-khau','dat-lai-mat-khau']) {
      const probe=await page.request.get(ORIGIN+'/'+slug,{timeout:20000});
      console.log('RECOVERY_PAGE_PROBE_'+slug+'='+probe.status());
    }
    const link=page.locator('#login-form a[href*="quen-mat-khau"]');
    await link.waitFor({state:'visible',timeout:25000});
    assert.equal(new URL(await link.getAttribute('href'),ORIGIN).pathname,'/quen-mat-khau');
    await link.click();
    await page.waitForURL(u=>u.pathname==='/quen-mat-khau',{timeout:25000});
    assert.equal((await page.locator('h1').innerText()).trim(),'Quên mật khẩu?');
    await page.locator('#lost-password-form').waitFor({state:'visible'});
    console.log('RECOVERY_ACCOUNT_TO_REQUEST_PAGE_PASS');
    let resetRequestCount=0;
    await page.route('**/api/user/lostpass',route=>{
      resetRequestCount++;
      assert.equal(route.request().method(),'POST');
      const body=route.request().postDataJSON();
      assert.equal(body.user_login,'test-buyer@example.invalid');
      return route.fulfill({status:200,contentType:'application/json',
        body:JSON.stringify({ok:true,msg:'accepted'})});
    });
    await page.locator('#lost-user-login').fill('test-buyer@example.invalid');
    await page.locator('#lost-password-submit').click();
    await page.waitForFunction(()=>document.querySelector('#lost-password-notice')?.textContent?.includes('Nếu tài khoản tồn tại'));
    assert.equal(resetRequestCount,1);
    assert.equal(await page.locator('#lost-user-login').inputValue(),'');
    await page.screenshot({path:OUT+'/request-desktop.png',fullPage:false});
    console.log('RECOVERY_REQUEST_UI_NO_EMAIL_SENT_PASS');

    const noKey=await page.goto(ORIGIN+'/dat-lai-mat-khau',{waitUntil:'domcontentloaded',timeout:50000});
    assert.equal(noKey.status(),200);
    await page.waitForFunction(()=>document.querySelector('#reset-password-form')?.hidden===true);
    assert((await page.locator('#reset-password-notice').innerText()).includes('Liên kết không hợp lệ'));
    console.log('RECOVERY_RESET_MISSING_TOKEN_PASS');

    const formRes=await page.goto(ORIGIN+'/dat-lai-mat-khau?key=synthetic-invalid-token&login=fixture.invalid',{waitUntil:'domcontentloaded',timeout:50000});
    assert.equal(formRes.status(),200);
    const form=page.locator('#reset-password-form');
    await form.waitFor({state:'visible'});
    await page.waitForFunction(()=>!window.location.search.includes('synthetic-invalid-token'));
    await page.locator('#new_password').fill('SecureTestPw1!'); // synthetic, never sent to WP
    await page.locator('#confirm_password').fill('DifferentTest1!');
    await page.locator('#reset-password-submit').click();
    assert((await page.locator('#reset-password-notice').innerText()).includes('không trùng khớp'));
    console.log('RECOVERY_PASSWORD_CONFIRM_VALIDATION_PASS');

    let resetCalls=0;
    await page.route('**/api/user/resetpass',route=>{
      resetCalls++;
      assert.equal(route.request().method(),'POST');
      const body=route.request().postDataJSON();
      assert.equal(body.key,'synthetic-invalid-token');
      assert.equal(body.login,'fixture.invalid');
      return route.fulfill({status:200,contentType:'application/json',
        body:JSON.stringify({ok:true})});
    });
    await page.locator('#confirm_password').fill('SecureTestPw1!');
    await page.locator('#reset-password-submit').click();
    await page.waitForFunction(()=>document.querySelector('#reset-password-form')?.hidden===true);
    assert.equal(resetCalls,1);
    await page.locator('#reset-password-login-link').waitFor({state:'visible'});
    assert.equal(new URL(await page.locator('#reset-password-login-link').getAttribute('href'),ORIGIN).pathname,'/lich-su-mua-hang');
    await page.screenshot({path:OUT+'/reset-desktop.png',fullPage:false});
    console.log('RECOVERY_RESET_UI_NO_PASSWORD_CHANGED_PASS');

    // Negative validation only: neither request can send email or change a password.
    const invalidLost=await page.request.post(ORIGIN+'/api/user/lostpass',{
      headers:{'Content-Type':'application/json'},data:JSON.stringify({})});
    assert.equal(invalidLost.status(),400,'Empty account must fail before contacting WP');
    const invalidReset=await page.request.post(ORIGIN+'/api/user/resetpass',{
      headers:{'Content-Type':'application/json'},data:JSON.stringify({})});
    assert.equal(invalidReset.status(),400,'Empty reset fields must fail before contacting WP');
    console.log('RECOVERY_SERVER_EMPTY_INPUT_REJECTION_PASS');

    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mobilePage=await mobile.newPage();
    const mob=await mobilePage.goto(ORIGIN+'/quen-mat-khau',{waitUntil:'domcontentloaded',timeout:50000});
    assert.equal(mob.status(),200);
    await mobilePage.locator('#lost-password-form').waitFor({state:'visible'});
    await mobilePage.screenshot({path:OUT+'/request-mobile.png',fullPage:false});
    console.log('RECOVERY_MOBILE_PASS');
    await mobile.close();
    await context.close();
    console.log('AQUA_PASSWORD_RECOVERY_PRODUCTION_QA_PASS NO_EMAIL NO_PASSWORD_CHANGE NO_ORDER');
  }finally{await browser.close();}
}
test().catch(err=>{console.error('AQUA_PASSWORD_RECOVERY_PRODUCTION_QA_FAIL='+String(err.message||err));process.exitCode=1;});
