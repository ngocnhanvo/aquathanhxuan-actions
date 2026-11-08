/** Read-only production Visual Builder interaction QA: never writes WordPress records. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const frontend = 'https://aquathanhxuan.io.vn';
const wordpress = 'https://admin.aquathanhxuan.io.vn';
const expected = '8bb706bef441b987626961e3030b583c5d270c87';
const stamp = Date.now();
(async () => {
  const markerResponse = await fetch(frontend + '/aquathanhxuan-staging-build.json?builderqa=' + stamp, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  assert.equal(markerResponse.status, 200, 'Production marker must be available');
  const marker = await markerResponse.json();
  assert.equal(marker.commit, expected, 'Production Astro must match requested Builder guard source');
  assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD, 'Admin QA credentials unavailable');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
      const admin = await context.newPage();
      const writes = [];
      context.on('request', request => {
        const url = request.url();
        if ((/\/wp-json\/(?:cocart|wc\/|api\/agent)|\/api\/agent\//.test(url) &&
             /^(POST|PUT|PATCH|DELETE)$/i.test(request.method()))) writes.push({ method: request.method(), url: url.split('?')[0] });
      });
      await context.route(/\/(?:wp-json\/(?:cocart|wc\/)|api\/agent\/)/, route => {
        if (/^(POST|PUT|PATCH|DELETE)$/i.test(route.request().method())) return route.abort('blockedbyclient');
        return route.continue();
      });
      await admin.goto(wordpress + '/wp-login.php', { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (await admin.locator('#user_login').count()) {
        await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
        await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
        await admin.locator('#wp-submit').click();
      }
      await admin.waitForURL(url => url.pathname.startsWith('/wp-admin/'), { timeout: 30000 });
      await admin.goto(wordpress + '/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',
        { waitUntil: 'domcontentloaded', timeout: 60000 });
      const frame = admin.frameLocator('#esc-vb-frame');
      const hero = frame.locator('[data-aqua-home-hero]').first();
      const sale = frame.locator('[data-aqua-home-sale]').first();
      await hero.waitFor({ state:'visible', timeout: 45000 });
      await sale.waitFor({ state:'visible', timeout: 45000 });
      const previewFrame = admin.frames().find(f => f.url().includes('/esc-builder/preview/'));
      assert(previewFrame, 'Builder preview frame missing');
      const previewUrl = previewFrame.url();
      const initialPages = context.pages().length;
      const slides = hero.locator('[data-hero-slide]');
      if ((await slides.count()) > 1) {
        const current = () => hero.locator('[data-hero-slide][data-active="true"]').first().getAttribute('data-esc-builder-row');
        const start = await current();
        await hero.locator('[data-hero-next]').click();
        await admin.waitForFunction(({ selector, before }) =>
          [...document.querySelectorAll(selector)].some(e => e.getAttribute('data-esc-builder-row') !== before && e.getAttribute('data-active') === 'true'),
          { selector: 'iframe#esc-vb-frame [data-hero-slide]', before: start }, { timeout: 1000 }).catch(() => {});
        const next = await current();
        assert.notEqual(next, start, 'Hero next arrow stayed locked');
        await hero.locator('[data-hero-prev]').click();
        assert.equal(await current(), start, 'Hero previous arrow did not return');
        const dots=hero.locator('[data-hero-dot]');
        if ((await dots.count()) > 1) {
          await dots.nth(1).click();
          assert.notEqual(await current(),start,'Hero dot stayed locked');
        }
      }
      if (viewport.width > 500) {
        const track=sale.locator('[data-sale-track]');
        await track.waitFor({state:'visible'});
        const before=await track.evaluate(e=>e.scrollLeft);
        await sale.locator('[data-sale-next]').click();
        await track.evaluate(async (element, original) => {
          for (let index=0;index<45 && element.scrollLeft<=original+5;index++)
            await new Promise(resolve=>setTimeout(resolve,100));
        }, before);
        const after=await track.evaluate(e=>e.scrollLeft);
        assert(after>before+5, 'Sale next slider remains locked');
        await sale.locator('[data-sale-prev]').click();
        await track.evaluate(async (element, original) => {
          for (let index=0;index<45 && element.scrollLeft>=original-5;index++)
            await new Promise(resolve=>setTimeout(resolve,100));
        }, after);
        const returned=await track.evaluate(e=>e.scrollLeft);
        assert(returned<after-5, 'Sale previous slider remains locked');
        console.log('BUILDER_SALE_CONTROLS=PASS ' + JSON.stringify({before,after,returned}));
      }

      const cart=sale.locator('[data-sale-add]').first();
      await cart.click();
      assert.deepEqual(writes, [], 'Preview attempted WooCommerce or agent mutation');
      const link=sale.locator('.aqua-sale__name-link[href]').first();
      await link.click();
      assert.equal(previewFrame.url(), previewUrl, 'Product link navigated preview');
      assert.equal(context.pages().length,initialPages,'Preview opened external tab');
      assert.deepEqual(writes, [], 'Preview click issued a mutation');
      console.log('BUILDER_SAFE_INTERACTIONS=PASS viewport='+viewport.width+' no_cms_write=true');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{
  console.error('BUILDER_SAFE_INTERACTIONS=FAIL '+(error.stack||error.message));
  process.exitCode=1;
});
