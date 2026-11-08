const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const frontend = 'https://aquathanhxuan.io.vn';
const wordpress = 'https://admin.aquathanhxuan.io.vn';
const expectedSha = '685c891569c20dccf1381b6374855e247e6b616b';
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
      assert.equal(await page.locator('#bottom-contact-bar').count(), 0,
        'Removed sticky bottom contact bar is still rendered');
      const bottomPadding = await page.locator('body > div.flex.min-h-screen.flex-col').first()
        .evaluate(element => getComputedStyle(element).paddingBottom);
      assert.equal(bottomPadding, '0px', 'Layout still reserves space for bottom contact bar');
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
        // Production rendering may omit editable versions; validate versions in
        // the authenticated Visual Builder, which carries the edit contract.
      }

      // A CTA exists only when native ESC Table supplies BOTH label and href.
      // Never synthesize a destination just to make the acceptance test pass.
      for (const [selector, tableId] of [
        ['[data-aqua-home-substrate] a[data-esc-link-field="button_href"]', 'home_02'],
        ['[data-aqua-home-combo] a[data-esc-link-field="button_href"]', 'home_03'],
        ['[data-aqua-home-equipment] a[data-esc-link-field="button_href"]', 'home_04'],
      ]) {
        const tableData = (data.contents || []).find(x => x.shortcode === tableId)?.data;
        const rows = (Array.isArray(tableData?.items) ? tableData.items : [])
          .filter(row => row?.title && row?.image?.src);
        const renderedRows = tableId === 'home_02' ? rows.slice(0, 1) : rows;
        const expected = renderedRows.filter(row => String(row.button_label || '').trim() &&
          String(row.button_href || '').trim());
        const ctas = page.locator(selector);
        assert.equal(await ctas.count(), expected.length, 'CTA count differs from native table: ' + tableId);
        for (const [index, item] of (await ctas.all()).entries()) {
          const actual = await item.getAttribute('href');
          assert(validUrl(actual), 'CTA invalid: ' + tableId);
          const expectedTarget = String(expected[index].button_href).trim();
          // Internal links may be rewritten by the site's basename/locale router.
          const actualPath = new URL(actual, frontend).pathname;
          const expectedPath = new URL(expectedTarget, frontend).pathname;
          assert(actualPath.endsWith(expectedPath) || expectedPath === '/',
            'CTA destination differs from WordPress data: ' + tableId);
        }
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

      // Capture genuine in-viewport pixels for each lazy-painted section.
      // Full-page Chromium screenshots alone can skip content-visibility sections.
      for (const [label, selector, expectedCards] of [
        ['equipment', '[data-aqua-home-equipment]', 2],
        ['benefits', '[data-aqua-home-benefits]', 4],
      ]) {
        const region = page.locator(selector);
        await region.scrollIntoViewIfNeeded();
        assert.equal(await region.locator('article').count(), expectedCards, label + ' card count');
        await region.screenshot({path: artifacts + '/' + label + '-' + width + 'x' + height + '.png'});
        console.log('HOMEPAGE_SECTION_CAPTURE=PASS ' + label + ' ' + width + 'x' + height);
      }
      await page.locator('[data-aqua-home-hero]').screenshot({path: artifacts + '/hero-' + width + 'x' + height + '.png'});
      await page.locator('#footer-contact').screenshot({path: artifacts + '/footer-' + width + 'x' + height + '.png'});
      // Footer scroll activates sticky header; the retired bar must stay absent.
      assert.equal(await page.locator('#bottom-contact-bar').count(), 0,
        'Sticky bottom contact bar reappeared after scrolling');
      // Capture a supplemental full-page overview before carousel/menu transitions.
      await page.screenshot({path: artifacts + '/full-' + width + 'x' + height + '.png', fullPage: true});

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
    // Native Hero/Sale cells must be editable by exact table/row/field and
    // version, not by matching text. These checks NEVER write to WordPress.
    const heroBuilder = frame.locator('[data-esc-source-table="home_00"]').first();
    const saleBuilder = frame.locator('[data-esc-source-table="home_01"]').first();
    for (const [id, root, required] of [
      ['home_00', heroBuilder, ['show_text']],
      ['home_01', saleBuilder, ['section_title', 'all_label', 'all_link']],
    ]) {
      await root.waitFor({state:'visible',timeout:45000});
      assert.equal(await root.getAttribute('data-esc-source-type'), 'esc_table',
        id + ' must identify its native source');
      assert.match(await root.getAttribute('data-esc-rendered-version') || '',
        /^[a-f0-9]{64}$/, id + ' missing native version');
      for (const field of required) {
        const cells = root.locator('[data-esc-builder-cell-field="' + field + '"]');
        assert((await cells.count()) > 0, id + ' missing native cell ' + field);
        const coords = await cells.evaluateAll(nodes => nodes.map(node =>
          node.getAttribute('data-esc-builder-cell-row')));
        assert(coords.every(row => row !== null && /^\d+$/.test(row)),
          id + ' missing row for ' + field);
        if (id === 'home_01') assert(coords.every(row => row === '0'),
          'Sale config must use physical native row zero');
      }
      console.log('HOMEPAGE_BUILDER_COORDS=PASS ' + id);
    }
    const heroSlides = heroBuilder.locator('[data-home-slide]');
    const slideCount = await heroSlides.count();
    assert(slideCount >= 1, 'Hero source has no slides');
    assert.equal(await heroBuilder.locator('[data-esc-builder-cell-field="show_text"]').count(),
      slideCount, 'Every Hero slide needs its own toggle');
    const activeHero = heroBuilder.locator('[data-home-slide][data-active="true"]').first();
    const beforeShowText = await activeHero.getAttribute('data-show-text');
    assert(['true', 'false'].includes(beforeShowText), 'Hero current text toggle invalid');
    await activeHero.locator('[data-esc-builder-cell-field="show_text"]').click();
    const heroControl = admin.locator('#esc-vb-hero-show-text');
    await heroControl.waitFor({state:'visible',timeout:25000});
    assert.match(await admin.locator('#esc-vb-edit-row').inputValue(),
      /^\d+:show_text$/, 'Hero click did not select its source cell');
    const nextShowText = beforeShowText === 'true' ? '0' : '1';
    await heroControl.selectOption(nextShowText);
    await heroBuilder.locator('[data-home-slide][data-active="true"][data-show-text="' + (nextShowText === '1' ? 'true' : 'false') + '"]')
      .waitFor({state:'attached',timeout:12000});
    await admin.locator('#esc-vb-edit-cancel').click();
    await heroBuilder.locator('[data-home-slide][data-active="true"][data-show-text="' + beforeShowText + '"]')
      .waitFor({state:'attached',timeout:12000});
    console.log('HOMEPAGE_BUILDER_HERO_TOGGLE=PASS draft_and_cancel=true cms_write=false');
    // Regression: the Builder must allow carousel interaction without navigation.
    // In particular, slide 2 must select its own native ESC Table row.
    if (slideCount > 1) {
      const slideBefore = await heroBuilder.locator('[data-home-slide][data-active="true"]').getAttribute('data-esc-builder-row');
      const nextControl = heroBuilder.locator('[data-hero-next]');
      assert.equal(await nextControl.getAttribute('data-esc-builder-preview-action'), '',
        'Next button missing preview interaction contract');
      assert.equal(await heroBuilder.locator('[data-hero-prev]').getAttribute('data-esc-builder-preview-action'), '',
        'Previous button missing preview interaction contract');
      assert.equal(await heroBuilder.locator('[data-hero-dot]').first().getAttribute('data-esc-builder-preview-action'), '',
        'Slide dots missing preview interaction contract');
      await nextControl.click();
      await admin.waitForTimeout(500);
      const secondSlide = heroBuilder.locator('[data-home-slide][data-active="true"]').first();
      const secondRow = await secondSlide.getAttribute('data-esc-builder-row');
      assert(secondRow !== slideBefore, 'Builder next click did not change slide');
      // The overlay may stay visible, but must not mask the underlying image cell.
      // Use real pointer hit-testing rather than dispatching a synthetic click.
      const imageHit = await secondSlide.evaluate(slide => {
        const media = slide.querySelector('[data-esc-builder-image-field="image"]');
        const rect = slide.getBoundingClientRect();
        const point = {x: rect.left + rect.width * 0.83, y: rect.top + rect.height * 0.45};
        const hit = document.elementFromPoint(point.x, point.y);
        return {isImage: Boolean(media && hit && (media === hit || media.contains(hit))),
          row: media?.getAttribute('data-esc-builder-image-row') || null,
          hitClass: hit?.className?.baseVal || hit?.className || hit?.tagName || 'none'};
      });
      assert(imageHit.isImage, 'Hero slide 2 overlay intercepts image pointer: ' + JSON.stringify(imageHit));
      assert.equal(imageHit.row, secondRow, 'Hero slide 2 image maps to wrong native ESC row');
      console.log('HOMEPAGE_BUILDER_SECOND_IMAGE_HIT=PASS row=' + secondRow);
      const imageBox = await secondSlide.locator('[data-esc-builder-image-field="image"] img').boundingBox();
      assert(imageBox && imageBox.width > 0 && imageBox.height > 0, 'Second Hero image has no hit area');
      await secondSlide.locator('[data-esc-builder-image-field="image"] img').click({
        position: {x: imageBox.width * 0.83, y: imageBox.height * 0.45}
      });
      await admin.waitForFunction(expected =>
        document.querySelector('#esc-vb-edit-row')?.value === expected,
        secondRow + ':image', {timeout:25000});
      console.log('HOMEPAGE_BUILDER_SECOND_IMAGE_EDIT=PASS row=' + secondRow + ' cms_write=false');
      const secondToggle = secondSlide.locator('[data-esc-builder-cell-field="show_text"]');
      await secondToggle.click();
      await admin.waitForFunction(expected =>
        document.querySelector('#esc-vb-edit-row')?.value === expected,
        secondRow + ':show_text', {timeout:25000});
      assert.equal(await admin.locator('#esc-vb-hero-show-text').isVisible(), true,
        'Second banner text toggle is not editable');
      console.log('HOMEPAGE_BUILDER_SECOND_SLIDE=PASS row=' + secondRow + ' cms_write=false');
    }

    const productCards = saleBuilder.locator('[data-esc-vb-product-readonly="true"]');
    assert((await productCards.count()) > 0, 'Sale product cards must identify WooCommerce as owner');
    const saleTitle = saleBuilder.locator('[data-esc-builder-cell-field="section_title"]').first();
    await saleTitle.click();
    await admin.waitForFunction(expected =>
      document.querySelector('#esc-vb-edit-row')?.value === expected,
      '0:section_title',{timeout:25000});
    assert((await admin.locator('#esc-vb-edit-title').inputValue()).trim(),
      'Sale section title did not load its native cell');
    const saleLabel = saleBuilder.locator('[data-esc-builder-cell-field="all_label"]').first();
    await saleLabel.click();
    await admin.waitForFunction(expected =>
      document.querySelector('#esc-vb-edit-row')?.value === expected,
      '0:all_label',{timeout:25000});
    const saleLink = saleBuilder.locator('[data-esc-builder-cell-field="all_link"]').first();
    const originalHref = await saleLink.getAttribute('href');
    assert(validUrl(originalHref), 'Sale current CTA href invalid');
    // Dispatch on the anchor itself: clicking its nested text span correctly
    // selects all_label, while clicking its outer anchor selects all_link.
    await saleLink.evaluate(anchor => anchor.click());
    await admin.waitForFunction(expected =>
      document.querySelector('#esc-vb-edit-row')?.value === expected,
      '0:all_link',{timeout:25000});
    const saleTextarea = admin.locator('#esc-vb-edit-title');
    assert(validUrl(await saleTextarea.inputValue()), 'Sale ESC Table link not loaded');
    const previewHref='/san-pham?esc_vb_qa_preview=1';
    await saleTextarea.fill(previewHref);
    await saleBuilder.locator('[data-esc-builder-cell-field="all_link"][href="' + previewHref + '"]')
      .waitFor({state:'attached',timeout:12000});
    await admin.locator('#esc-vb-edit-cancel').click();
    // The parent sends an authenticated clear message to the iframe; wait for
    // its event loop rather than racing an immediate DOM attribute read.
    const restored = await saleLink.evaluate(async (anchor, expected) => {
      for (let attempt = 0; attempt < 80; attempt++) {
        if (anchor.getAttribute('href') === expected) return true;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return false;
    }, originalHref);
    assert(restored, 'Sale preview cancellation must preserve the published link');
    console.log('HOMEPAGE_BUILDER_SALE_CELLS=PASS title,label,href preview_and_cancel=true cms_write=false');

    // Footer is streamed after the page sections. Wait for the same marker used
    // by the independently passing Footer Builder QA, not an immediate count.
    const builderFooter = frame.locator('#footer-contact');
    await builderFooter.waitFor({state:'visible', timeout:45000});
    const firstFooterField = builderFooter.locator('[data-esc-vb-footer-field]').first();
    await firstFooterField.waitFor({state:'attached', timeout:20000});
    const footerFields = await builderFooter.locator('[data-esc-vb-footer-field]').count();
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