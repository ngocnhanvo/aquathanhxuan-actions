/** Read-only production Visual Builder interaction QA: never writes WordPress records. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const frontend = 'https://aquathanhxuan.io.vn';
const wordpress = 'https://admin.aquathanhxuan.io.vn';
const expected = '3388ab1988d083eaf3a0c149a09e9367a69b0640';
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
      const itemSchemaRequests=[];
      context.on('request',req=>{
        if(req.url().includes('/esc-builder/v1/item-schema')){
          itemSchemaRequests.push({phase:'request',method:req.method()});
        }
      });
      context.on('response',res=>{
        if(res.url().includes('/esc-builder/v1/item-schema')){
          itemSchemaRequests.push({phase:'response',status:res.status()});
        }
      });
      context.on('requestfailed',req=>{
        if(req.url().includes('/esc-builder/v1/item-schema')){
          itemSchemaRequests.push({phase:'failed',error:req.failure()?.errorText});
        }
      });
      const writes = [];
      context.on('request', request => {
        const url = request.url();
        if ((/\/wp-json\/(?:cocart|wc\/|api\/agent|esc-builder\/v1\/(?:swap-items|insert-item|delete-item))|\/api\/agent\//.test(url) &&
             /^(POST|PUT|PATCH|DELETE)$/i.test(request.method()))) writes.push({ method: request.method(), url: url.split('?')[0] });
      });
      await context.route(/\/(?:wp-json\/(?:cocart|wc\/|esc-builder\/v1\/(?:swap-items|insert-item|delete-item))|api\/agent\/)/, route => {
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
      await admin.frameLocator('#esc-vb-frame').locator('[data-aqua-home-hero][data-hero-ready="true"]')
        .waitFor({ state:'attached', timeout: 45000 });
      await admin.frameLocator('#esc-vb-frame').locator('[data-aqua-home-sale][data-sale-ready="true"]')
        .waitFor({ state:'attached', timeout: 45000 });
      const previewFrame = admin.frames().find(f => f.url().includes('/esc-builder/preview/'));
      assert(previewFrame, 'Builder preview frame missing');
      const previewUrl = previewFrame.url();
      const initialPages = context.pages().length;
      const slides = hero.locator('[data-hero-slide]');
      if ((await slides.count()) > 1) {
        const current = () => hero.locator('[data-hero-slide][data-active="true"]').first().getAttribute('data-esc-builder-row');
        const start = await current();
        const candidates = await slides.evaluateAll(nodes=>nodes.map(node=>({
          row:node.getAttribute('data-esc-builder-row'),
          audience:node.getAttribute('data-audience'),
          active:node.getAttribute('data-active')
        })));
        const button = hero.locator('[data-hero-next]');
        console.log('BUILDER_HERO_BEFORE '+JSON.stringify({viewport,candidates,initial:start,buttonVisible:await button.isVisible()}));
        const controlsDebug = await hero.evaluate(root=>{
          const b=root.querySelector('[data-hero-next]');
          const imageAncestor=b.closest('[data-esc-builder-image-row][data-esc-builder-image-field]');
          window.__heroClicks={capture:0,target:0,bubble:0};
          window.addEventListener('click',event=>{
            if(event.target===b || b.contains(event.target)) window.__heroClicks.capture++;
          },true);
          b.addEventListener('click',()=>{window.__heroClicks.target++;});
          document.addEventListener('click',event=>{
            if(event.target===b || b.contains(event.target)) window.__heroClicks.bubble++;
          });
          return {ready:root.dataset.heroReady,withinMain:Boolean(b.closest('main,[data-tablepress-preview]')),
            explicit:b.hasAttribute('data-esc-builder-preview-action'),
            blocked:Boolean(b.closest('[data-esc-builder-preview-block]')),imageAncestor:Boolean(imageAncestor),
            disabled:b.disabled,html:b.outerHTML.slice(0,400)};
        });
        if (await button.isVisible()) {
        await button.click();
        await admin.waitForTimeout(350);
        const next = await current();
        const clicks=await previewFrame.evaluate(()=>window.__heroClicks);
        console.log('BUILDER_HERO_AFTER '+JSON.stringify({viewport,next,controlsDebug,clicks}));
        if(next===start){
          await button.evaluate(b=>b.click());
          await admin.waitForTimeout(200);
          console.log('BUILDER_HERO_SYNTHETIC '+JSON.stringify({next:await current(),clicks:await previewFrame.evaluate(()=>window.__heroClicks)}));
        }
        assert.notEqual(await current(), start, 'Hero next arrow stayed locked: '+JSON.stringify(candidates));
        await hero.locator('[data-hero-prev]').click();
        assert.equal(await current(), start, 'Hero previous arrow did not return');
        }
        const dots=hero.locator('[data-hero-dot]');
        if ((await dots.count()) > 1) {
          await dots.nth(1).evaluate(node => {
            // Scroll the dot away from the sticky Header before a real hit-tested click.
            const rect = node.getBoundingClientRect();
            const header = document.querySelector('#main-header')?.getBoundingClientRect();
            if (header && rect.top < header.bottom + 20) {
              window.scrollBy({ top: rect.top - header.bottom - 40, behavior: 'instant' });
            }
          });
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
      // Visual ESC Table Product reference picker (no save/write). The card
      // order shown by WooCommerce is not a trusted ESC Table row index.
      const cards=sale.locator('[data-sale-card][data-esc-builder-product-id]');
      assert((await cards.count()) >= 2, 'Sale needs two published cards for Product swap QA');
      await sale.locator('.aqua-sale__bolt').click();
      await admin.locator('#esc-vb-item-panel').waitFor({state:'visible',timeout:20000});
      await admin.locator('#esc-vb-item-sort-open').click();
      await admin.locator('#esc-vb-item-sort-body').waitFor({state:'visible',timeout:20000});
      await admin.waitForTimeout(8000);
      const pickDebug=await admin.evaluate(()=>({
        status:document.querySelector('#esc-vb-item-sort-status')?.textContent,
        context:document.querySelector('#esc-vb-item-context')?.textContent,
        source:document.querySelector('#esc-vb-item-sort-source')?.textContent,
        panelVisible:!document.querySelector('#esc-vb-item-panel')?.hidden,
        bodyVisible:!document.querySelector('#esc-vb-item-sort-body')?.hidden,
        indexedList:document.querySelectorAll('#esc-vb-item-sort-preview-list li button').length
      }));
      console.log('BUILDER_PRODUCT_PICK_INITIAL='+JSON.stringify({...pickDebug,itemSchemaRequests,ticketType:await admin.evaluate(()=>typeof window.escVBGetTicket)}));
      assert(pickDebug.status?.includes('Nhấp sản phẩm'),
        'Expected visual Product source picker: '+JSON.stringify(pickDebug));
      const selectedSource=cards.nth(0);
      const selectedTarget=cards.nth(1);
      const sourceId=await selectedSource.getAttribute('data-esc-builder-product-id');
      const targetId=await selectedTarget.getAttribute('data-esc-builder-product-id');
      assert(sourceId&&targetId&&sourceId!==targetId,'Product card IDs must be unique');
      await selectedSource.locator('.aqua-sale__name-link').click();
      await admin.waitForFunction(()=>
        !document.querySelector('#esc-vb-item-sort-source')?.textContent?.includes('Chưa chọn'),
        null,{timeout:15000});
      assert.equal(await selectedSource.getAttribute('data-esc-vb-item-source'),'',
        'Product source must have red source mark');
      await selectedTarget.locator('.aqua-sale__name-link').click();
      await admin.waitForFunction(()=>
        !document.querySelector('#esc-vb-item-sort-save')?.disabled,
        null,{timeout:15000});
      assert.equal(await selectedTarget.getAttribute('data-esc-vb-item-target'),'',
        'Product target must have blue target mark');
      assert.equal(previewFrame.url(),previewUrl,'Product swap picking navigated away');
      await admin.locator('#esc-vb-item-sort-cancel').click();
      assert.deepEqual(writes,[],'Product swap preview must not write data');
      console.log('BUILDER_PRODUCT_PICK=PASS '+JSON.stringify({viewport:viewport.width,sourceId,targetId,canceled:true}));
      console.log('BUILDER_SAFE_INTERACTIONS=PASS viewport='+viewport.width+' no_cms_write=true');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{
  console.error('BUILDER_SAFE_INTERACTIONS=FAIL '+(error.stack||error.message));
  process.exitCode=1;
});
