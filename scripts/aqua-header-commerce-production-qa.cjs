const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const origin = 'https://aquathanhxuan.io.vn';
const root = new URL(origin);
if (root.hostname !== 'aquathanhxuan.io.vn') throw new Error('Wrong frontend target');
const evidence = 'artifacts/aqua-header-commerce';
fs.mkdirSync(evidence, { recursive: true });

async function verifyCart(page, scope) {
  const links = page.locator('.js-cart-navigation');
  await links.first().waitFor();
  const count = await links.count();
  assert(count >= 2, 'Expected shared header and mobile menu cart controls');
  await page.evaluate(() => {
    localStorage.setItem('esc-cart-storage', JSON.stringify({
      state: { cartKey: 'qa-nonexistent-local-cart', items: [{quantity:2}, {quantity:{value:3}}] },
      version: 0
    }));
    window.dispatchEvent(new CustomEvent('cart:updated'));
  });
  await page.waitForFunction(() => {
    const links = [...document.querySelectorAll('.js-cart-navigation')];
    return links.length >= 2 && links.every(link =>
      new URL(link.href).searchParams.get('cart_key') === 'qa-nonexistent-local-cart'
      && link.querySelector('.js-cart-badge')?.textContent === '5'
    );
  });
  const result = await page.locator('.js-cart-navigation').evaluateAll(els =>
    els.map(el=>({ href:new URL(el.href).pathname, hasLabel:el.textContent.includes('Giỏ hàng') }))
  );
  assert(result.some(x => x.hasLabel), 'A visible cart text must be inside the live cart link');
  await page.evaluate(() => {
    localStorage.removeItem('esc-cart-storage');
    window.dispatchEvent(new CustomEvent('cart:updated'));
  });
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.js-cart-navigation')].every(link =>
      !new URL(link.href).searchParams.has('cart_key')
      && link.querySelector('.js-cart-badge')?.classList.contains('hidden')
    )
  );
  console.log('CART_HEADER_SYNC_PASS ' + scope + ' controls=' + count);
}

async function main() {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const desktop = await browser.newContext({ viewport: {width:1440,height:900} });
    const page = await desktop.newPage();
    const response = await page.goto(origin+'/', {waitUntil:'domcontentloaded',timeout:45000});
    assert(response && response.ok(), 'Home page must load');
    await page.locator('#main-header').waitFor();
    await verifyCart(page, 'desktop');
    const accountGuest = page.locator('#header-brandbar .js-user-account-container .js-account-guest').first();
    await accountGuest.waitFor({state:'visible'});
    const accountHref = await accountGuest.getAttribute('href');
    assert(accountHref && !accountHref.startsWith('http'), 'Account should stay on frontend');
    const accountResponse = await page.goto(new URL(accountHref,origin).href,{waitUntil:'domcontentloaded',timeout:45000});
    assert(accountResponse && accountResponse.status() === 200, 'Customer account route must be HTTP 200');
    await page.locator('#login-form-wrapper').waitFor({state:'visible',timeout:25000});
    await page.locator('#login-form').waitFor({state:'visible',timeout:10000});
    console.log('ACCOUNT_GUEST_LOGIN_PASS');

    // Browser-only signed-session fixture: no customer account or order is created.
    const fakeName = '<img src=x onerror=alert(1)> QA';
    await page.route('**/api/user/info', route => route.fulfill({
      status:200,
      contentType:'application/json',
      body:JSON.stringify({id:142,name:fakeName,email:'qa@example.invalid'})
    }));
    await page.route('**/api/user/logout', route => {
      if (route.request().method() !== 'POST') return route.continue();
      console.log('ACCOUNT_LOGOUT_POST_PASS');
      return route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});
    });
    await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:45000});
    const accountButton = page.locator('#header-brandbar .js-user-account-container .js-account-toggle').first();
    await accountButton.waitFor({state:'visible',timeout:15000});
    await accountButton.click();
    const dropdown = page.locator('#header-brandbar .js-user-account-container .js-account-dropdown').first();
    await dropdown.waitFor({state:'visible'});
    assert.equal(await dropdown.locator('.js-account-name').innerText(), fakeName);
    assert.equal(await dropdown.locator('.js-account-name img').count(),0,'Names must not become HTML markup');
    const orders = dropdown.locator('a[role="menuitem"]');
    assert((await orders.getAttribute('href')) === accountHref, 'My orders must lead to same account route');
    console.log('ACCOUNT_SIGNED_MENU_AND_SAFE_TEXT_PASS');
    await page.screenshot({path:evidence+'/desktop-home.png',fullPage:false});
    await dropdown.locator('.js-account-logout').click();
    await page.waitForURL(url=>url.pathname===new URL(accountHref,origin).pathname,{timeout:15000});
    console.log('ACCOUNT_LOGOUT_NAVIGATION_PASS');
    await desktop.close();

    const mobile = await browser.newContext({
      viewport:{width:390,height:844}, isMobile:true, hasTouch:true,
    });
    const mobilePage = await mobile.newPage();
    const mobResponse=await mobilePage.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:45000});
    assert(mobResponse && mobResponse.ok(),'Mobile homepage must load');
    await verifyCart(mobilePage,'mobile');
    await mobilePage.locator('#header-brandbar .js-user-account-container .js-account-guest').first().waitFor({state:'visible'});
    await mobilePage.screenshot({path:evidence+'/mobile-home.png',fullPage:false});
    console.log('MOBILE_ACCOUNT_AND_CART_PASS');
    await mobile.close();
    console.log('AQUA_HEADER_COMMERCE_PRODUCTION_QA_PASS - NO ORDERS NO PAYMENTS NO CMS WRITES');
  } finally {
    await browser.close();
  }
}
main().catch(error=>{console.error('AQUA_HEADER_COMMERCE_PRODUCTION_QA_FAIL',error.message);process.exitCode=1;});
