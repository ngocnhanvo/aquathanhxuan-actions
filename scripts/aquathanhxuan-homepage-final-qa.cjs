const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const frontend = 'https://aquathanhxuan.io.vn';
const wordpress = 'https://admin.aquathanhxuan.io.vn';
const expectedSha = 'a88d3981e01911a958fc904a29f49b67df15f2f3';
const viewports = [[1440, 900], [1024, 768], [768, 1024], [844, 390], [390, 844]];
const sections = [
  ['Hero', '[data-aqua-home-hero]'],
  ['Sale', '[data-aqua-home-sale]'],
  ['Substrate', '[data-aqua-home-substrate]'],
  ['HotCombo', '[data-aqua-home-combo]'],
  ['Equipment', '[data-aqua-home-equipment]'],
  ['Benefits', '[data-aqua-home-benefits]'],
  ['Footer', '#footer-contact'],
];
const tables = ['home_00','home_01','home_02','home_03','home_04','home_05'];
const artifacts = 'artifacts/homepage-final';
fs.mkdirSync(artifacts, { recursive: true });

function validUrl(href) {
  if (!href || href === '#' || /^javascript:/i.test(href)) return false;
  try { return ['http:', 'https:'].includes(new URL(href, frontend).protocol); }
  catch { return false; }
}
async function assertHealthyImage(locator, caption) {
  const src = await locator.getAttribute('src');
  assert(validUrl(src), caption + ' missing image URL');
  await locator.scrollIntoViewIfNeeded();
  const healthy = await locator.evaluate(async img => {
    try { await img.decode(); return img.complete && img.naturalWidth > 0; }
    catch { return false; }
  });
  assert(healthy, caption + ' broken image ' + src);
}

(async () => {
  const markerResp = await fetch(frontend + '/aquathanhxuan-staging-build.json?final=' + Date.now(), {
    headers: { 'Cache-Control': 'no-cache' }
  });
  assert.equal(markerResp.status, 200, 'DEPLOY_READY marker HTTP');
  const marker = await markerResp.json();
  assert.equal(marker.commit, expectedSha, 'DEPLOY_READY source SHA does not match latest Astro master');
  console.log('HOMEPAGE_DEPLOY_READY=PASS ' + expectedSha);

  const dataResp = await fetch(frontend + '/data/page-default.json?final=' + Date.now(), {
    headers: { 'Cache-Control': 'no-cache' }
  });
  assert.equal(dataResp.status, 200, 'CMS_CHAIN page-default missing');
  const data = await dataResp.json();
  const ids = (Array.isArray(data.contents) ? data.contents : []).map(x => String(x?.shortcode || ''));
  for (const id of tables) {
    assert.equal(ids.filter(x => x === id).length, 1, 'CMS_CHAIN table missing/duplicate: ' + id);
  }
  assert.deepEqual(ids.filter(x => tables.includes(x)), tables, 'CMS_CHAIN homepage table order');
  console.log('HOMEPAGE_CMS_CHAIN=PASS ' + ids.join(','));

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await page.goto(frontend + '/?finalqa=' + Date.now(), {
        waitUntil: 'domcontentloaded', timeout: 60000
      });
      for (const [label, selector] of sections) {
        await page.locator(selector).first().waitFor({ state: 'visible', timeout: 25000 });
      }
      assert.equal(await page.locator('#header-contacts').isVisible(), false, 'Legacy header contacts visible');
      assert.equal(await page.locator('#header-company-caption').isVisible(), false, 'Legacy header wordmark visible');
      assert.equal(await page.locator('#header-navrow').isVisible(), width >= 900, 'Wrong responsive category nav');
      assert.equal(await page.locator('#hamburger-btn').isVisible(), width < 900, 'Wrong responsive hamburger');

      const headerLogo = page.locator('#header-brandbar a[aria-label="Về trang chủ"] img').first();
      const footerLogo = page.locator('#footer-contact section[aria-labelledby="footer-company-title"] img').first();
      await assertHealthyImage(headerLogo, 'Header official CMS logo');
      await assertHealthyImage(footerLogo, 'Footer official CMS logo');
      const headerSrc = await headerLogo.getAttribute('src');
      const footerSrc = await footerLogo.getAttribute('src');
      assert.equal(new URL(headerSrc, frontend).href, new URL(footerSrc, frontend).href,
        'Footer/header logo sources diverged');

      for (const [label, selector] of [
        ['Substrate', '[data-aqua-home-substrate] img'],
        ['HotCombo', '[data-aqua-home-combo] img'],
        ['Equipment', '[data-aqua-home-equipment] article img'],
      ]) await assertHealthyImage(page.locator(selector).first(), label);

      for (const [name, selector, id] of [
        ['Substrate', '[data-aqua-home-substrate]', 'home_02'],
        ['Combo', '[data-aqua-home-combo]', 'home_03'],
        ['Equipment', '[data-aqua-home-equipment]', 'home_04'],
        ['Benefits', '[data-aqua-home-benefits]', 'home_05'],
      ]) {
        const section = page.locator(selector);
        assert.equal(await section.getAttribute('data-esc-source-table'), id, name + ' wrong table');
        const version = await section.getAttribute('data-esc-rendered-version');
        assert.match(version || '', /^[a-f0-9]{64}$/, name + ' missing source version');
      }

      for (const selector of [
        '[data-aqua-home-substrate] a[data-esc-link-field="button_href"]',
        '[data-aqua-home-combo] a[data-esc-link-field="button_href"]',
        '[data-aqua-home-equipment] a[data-esc-link-field="button_href"]',
      ]) {
        const ctas = page.locator(selector);
        assert((await ctas.count()) > 0, 'CTA missing: ' + selector);
        for (const item of await ctas.all()) assert(validUrl(await item.getAttribute('href')), 'CTA invalid: ' + selector);
      }

      const layout = await page.evaluate(() => ({
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        heroVisible: Boolean(document.querySelector('[data-aqua-home-hero] [data-hero-slide][data-active="true"]')),
        saleCards: document.querySelectorAll('[data-aqua-home-sale] [data-sale-card]').length,
        benefits: document.querySelectorAll('[data-aqua-home-benefits] article').length,
        footerCategories: document.querySelectorAll('#footer-contact section[aria-labelledby="footer-category-title"] a').length,
      }));
      assert(layout.documentWidth <= layout.viewport + 1, 'Horizontal overflow ' + width + 'x' + height);
      assert(layout.heroVisible, 'Hero has no active visible slide');
      assert(layout.saleCards > 0, 'Real WooCommerce sale cards missing');
      assert.equal(layout.benefits, 4, 'Benefits row count');
      assert(layout.footerCategories >= 3, 'Real WordPress Footer categories missing');

      const heroNext = page.locator('[data-aqua-home-hero] [data-hero-next]');
      if (await heroNext.isVisible()) {
        const initial = await page.locator('[data-aqua-home-hero] [data-hero-slide][data-active="true"]').first()
          .getAttribute('data-audience');
        await heroNext.click();
        await page.waitForTimeout(250);
        assert.equal(await page.locator('[data-aqua-home-hero] [data-hero-slide][data-active="true"]').count(), 1,
          'Hero next created invalid active slide');
        console.log('HOMEPAGE_HERO_NAV=PASS ' + width + 'x' + height + ' audience=' + initial);
      }

      if (width < 900) {
        const button = page.locator('#hamburger-btn');
        await button.click();
        await page.locator('#mobile-menu-container[aria-hidden="false"]').waitFor({state:'visible', timeout:10000});
        assert.equal(await button.getAttribute('aria-expanded'), 'true', 'Mobile drawer button state');
        assert.equal(await page.locator('#mobile-menu-container').getAttribute('inert'), null, 'Drawer must be focusable');
        assert.equal(await page.locator('#mobile-menu-overlay').isVisible(), true, 'Drawer overlay missing');
        await page.locator('[data-mobile-menu-close]').click();
        await page.waitForFunction(() => document.querySelector('#mobile-menu-container')?.getAttribute('aria-hidden') === 'true');
        assert.equal(await button.getAttribute('aria-expanded'), 'false', 'Drawer close button state');

        const searchButton = page.locator('#mobile-search-btn');
        await searchButton.click();
        await page.locator('#mobile-search-panel[aria-hidden="false"]').waitFor({state:'visible', timeout:10000});
        assert.equal(await searchButton.getAttribute('aria-expanded'), 'true', 'Mobile search state');
        assert.equal(await page.locator('#mobile-product-search').isVisible(), true, 'Mobile search input absent');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('#mobile-search-panel')?.getAttribute('aria-hidden') === 'true');
        assert.equal(await searchButton.getAttribute('aria-expanded'), 'false', 'Escape did not close search');
        console.log('HOMEPAGE_MOBILE_CONTROLS=PASS ' + width + 'x' + height);
      } else {
        const searchForm = page.locator('#header-brandbar form[role="search"]');
        assert.equal(await searchForm.isVisible(), true, 'Desktop search unavailable');
        const desktopTriggers = page.locator('#desktop-menu button[data-menu-trigger]');
        if (await desktopTriggers.count()) {
          const first = desktopTriggers.first();
          await first.click();
          assert.equal(await first.getAttribute('aria-expanded'), 'true', 'Desktop dropdown click did not open');
          const panelId = await first.getAttribute('aria-controls');
          assert(panelId, 'Dropdown panel ID missing');
          assert.equal(await page.locator('#' + panelId).isVisible(), true, 'Dropdown panel invisible');
          await first.click();
          assert.equal(await first.getAttribute('aria-expanded'), 'false', 'Dropdown click did not close');
        }
        console.log('HOMEPAGE_DESKTOP_CONTROLS=PASS ' + width + 'x' + height);
      }

      await page.locator('[data-aqua-home-hero]').screenshot({path: artifacts + '/hero-' + width + 'x' + height + '.png'});
      await page.locator('#footer-contact').screenshot({path: artifacts + '/footer-' + width + 'x' + height + '.png'});
      console.log('HOMEPAGE_VIEWPORT=PASS ' + width + 'x' + height + ' ' + JSON.stringify(layout));
      await context.close();
    }

    assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD, 'Builder QA secrets unavailable');
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const admin = await context.newPage();
    await admin.goto(wordpress + '/wp-login.php', {waitUntil:'domcontentloaded',timeout:60000});
    if (await admin.locator('#user_login').count()) {
      await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await admin.locator('#wp-submit').click();
    }
    await admin.waitForURL(url => url.pathname.startsWith('/wp-admin/'), {timeout:30000});
    await admin.goto(wordpress + '/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',
      {waitUntil:'domcontentloaded',timeout:60000});
    const frame = admin.frameLocator('#esc-vb-frame');
    for (const id of ['home_02', 'home_03', 'home_04', 'home_05']) {
      const section = frame.locator('[data-esc-source-table="' + id + '"]');
      await section.first().waitFor({state:'visible', timeout:45000});
      const version = await section.first().getAttribute('data-esc-rendered-version');
      assert.match(version || '', /^[a-f0-9]{64}$/, 'Builder missing version ' + id);
      const fields = await section.first().locator('[data-esc-builder-cell-field]').evaluateAll(elements =>
        elements.map(el => ({
          field: el.getAttribute('data-esc-builder-cell-field'),
          row: el.getAttribute('data-esc-builder-cell-row'),
        })));
      assert(fields.length > 0, 'Builder missing editable cells ' + id);
      assert(fields.every(x => x.field && x.row !== null), 'Builder incomplete cell mapping ' + id);
      console.log('HOMEPAGE_BUILDER_COORDS=PASS ' + id + ' count=' + fields.length);
    }
    const footerFields = await frame.locator('#footer-contact [data-esc-vb-footer-field]').count();
    assert(footerFields > 0, 'Builder Footer CMS field mapping missing');
    await admin.screenshot({path: artifacts + '/builder-readonly.png'});
    console.log('HOMEPAGE_BUILDER=PASS footerFields=' + footerFields);
    await context.close();
    console.log('HOMEPAGE_FINAL_QA=PASS');
  } finally { await browser.close(); }
})().catch(error => {
  console.error('HOMEPAGE_FINAL_QA=FAIL ' + (error.stack || error.message));
  process.exitCode = 1;
});