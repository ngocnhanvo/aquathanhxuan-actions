const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');

const ORIGIN = 'https://aquathanhxuan.io.vn';
const ROUTE = '/lich-su-mua-hang';
const OUT = 'artifacts/aqua-order-history-skeleton';
fs.mkdirSync(OUT, { recursive: true });

const sampleOrder = {
  number: 'QA-PREVIEW', date: '10/11/2026', status: 'processing',
  items: [{ name: 'Sản phẩm minh họa', quantity: 1, price: '100.000 đ', subtotal: '100.000 đ', image: '', meta: [] }],
  coupons: [], paymentMethod: 'Thanh toán khi nhận hàng',
  subtotal: '100.000 đ', discountTotal: '0 đ', taxTotal: '0 đ', total: '100.000 đ'
};

async function runCase(browser, name, viewport, status, body, expected) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  let releaseRequest;
  const gate = new Promise(resolve => { releaseRequest = resolve; });
  let apiCalled = 0;
  try {
    await page.route('**/api/user/order', async route => {
      apiCalled++;
      await gate;
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const req = page.waitForRequest(request =>
      new URL(request.url()).pathname === '/api/user/order', {timeout: 30000});
    const response = await page.goto(ORIGIN + ROUTE, {waitUntil:'domcontentloaded', timeout: 45000});
    assert(response && response.status() === 200, name + ': route must be HTTP 200');

    const skeleton = page.locator('#order-loading-skeleton');
    await skeleton.waitFor({state:'visible', timeout: 15000});
    assert.match(await skeleton.innerText(), /Đang tải lịch sử đơn hàng/);
    assert.equal(await page.locator('#order-content-wrapper').getAttribute('aria-busy'), 'true');
    assert.equal(await page.locator('#orders-container').innerText(), '', name + ': no orders before API response');
    await req;
    assert.equal(apiCalled, 1, name + ': one order request');
    await page.screenshot({ path: OUT + '/' + name + '-loading.png', fullPage: false });

    releaseRequest();
    await skeleton.waitFor({state:'detached', timeout: 15000});
    assert.equal(await page.locator('#order-content-wrapper').getAttribute('aria-busy'), 'false');

    if (expected === 'orders') {
      await page.getByText('Mã đơn: #QA-PREVIEW').waitFor({state:'visible'});
      assert.equal(await page.locator('#login-form-wrapper').isVisible(), false);
    } else if (expected === 'guest') {
      await page.locator('#login-form-wrapper').waitFor({state:'visible'});
      assert.equal(await page.locator('#order-content-wrapper').isVisible(), false);
    } else if (expected === 'empty') {
      await page.getByText('Bạn chưa có đơn hàng nào.').waitFor({state:'visible'});
    } else if (expected === 'error') {
      await page.getByText('Không thể tải danh sách đơn hàng.').waitFor({state:'visible'});
    }

    const overflow = await page.evaluate(() =>
      ({ actual: document.documentElement.scrollWidth, allowed: window.innerWidth + 2 }));
    assert(overflow.actual <= overflow.allowed,
      name + ': horizontal overflow ' + JSON.stringify(overflow));
    console.log('AQUA_ORDER_SKELETON_' + name.toUpperCase() + '=PASS');
  } finally {
    releaseRequest();
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
  try {
    await runCase(browser, 'desktop-orders', {width:1440,height:900}, 200,
      {ok:true,orders:[sampleOrder]}, 'orders');
    await runCase(browser, 'desktop-guest', {width:1440,height:900}, 401,
      {ok:false,msg:'Unauthorized'}, 'guest');
    await runCase(browser, 'mobile-empty', {width:390,height:844}, 200,
      {ok:true,orders:[]}, 'empty');
    await runCase(browser, 'mobile-error', {width:390,height:844}, 500,
      {ok:false,msg:'Không thể tải danh sách đơn hàng.'}, 'error');
    console.log('AQUA_ORDER_HISTORY_SKELETON_QA_PASS NO_ORDERS NO_CUSTOMERS NO_CMS_WRITES');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('AQUA_ORDER_HISTORY_SKELETON_QA_FAIL', err);
  process.exitCode = 1;
});
