/** Offline Chromium fixtures exercise real source guards; no site/WordPress requests. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve('.qa/package.json'));
const { chromium } = require('playwright');
const ts = require('typescript');
const astro = path.resolve(process.env.ASTRO_SOURCE || 'source-astro');
const php = path.resolve(process.env.PHP_SOURCE || 'source-php');
const output = path.resolve('artifacts/visual-builder');
await mkdir(output, { recursive: true });
const sources = {
  astro: execFileSync('git', ['-C', astro, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  php: execFileSync('git', ['-C', php, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
};
const modules = [
  'builderHeaderNavLock', 'builderFooterSelection', 'builderEditabilityCues', 'builderSectionDrafts',
];
const moduleScripts = [];
for (const name of modules) {
  const source = await readFile(path.join(astro, 'src/lib/wordpress', name + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  moduleScripts.push(`(() => { const exports = {}; ${compiled}\nObject.assign(window.__vbExports, exports); })();`);
}
const preview = await readFile(path.join(astro, 'src/pages/esc-builder/preview/[pageId].astro'), 'utf8');
const policyStart = preview.indexOf('        function isSafePreviewControl(target,event) {');
const listenerStart = preview.indexOf('        document.addEventListener("click", (event) => {', policyStart);
const listenerEnd = preview.indexOf('\n        }, true);', listenerStart);
assert(policyStart >= 0 && listenerStart > policyStart && listenerEnd > listenerStart,
  'Actual generic preview interaction contract is missing');
const clickPolicy = preview.slice(policyStart, listenerEnd + '\n        }, true);'.length);
const plugin = await readFile(path.join(php, 'wp-content/plugins/esc-visual-builder/esc-visual-builder.php'), 'utf8');
for (const module of ['shared-menu', 'shared-footer', 'shared-footer-media', 'shared-footer-assets']) {
  assert(plugin.includes(`/includes/${module}.php`), `${module} is not wired into WordPress`);
}

const fixture = `<!doctype html><html class="esc-builder-preview"><head><meta charset="utf-8"><style>
body{font:16px/1.5 system-ui;margin:0;background:#f1f5f9;color:#0f172a}header,main,footer{margin:16px;padding:20px;background:white;border:1px solid #cbd5e1;border-radius:10px}nav{display:flex;gap:18px;flex-wrap:wrap}button,a{font:inherit}button{padding:8px 12px;cursor:pointer}section{padding:16px;margin:10px 0;border:1px solid #ddd}[data-esc-vb-region-state="editable"]:hover{outline:2px dashed #2563eb}[data-esc-vb-region-state="readonly"]:hover{outline:2px dashed #94a3b8}#esc-vb-editability-hint{position:fixed;bottom:0;right:0;pointer-events:none;padding:12px;background:#eff6ff;max-width:85%}[hidden]{display:none!important}
</style></head><body>
<header id="main-header"><nav>
<a id="menu-link" data-esc-vb-menu-item-id="71" href="https://outside.example.test/" target="_blank" rel="noopener noreferrer">Menu item</a>
<button type="button" id="parent-toggle" data-menu-trigger data-esc-vb-menu-item-id="72" aria-expanded="false">Parent item</button>
</nav></header>
<main>
<section data-tablepress-preview="sample_07"><h1>Preview interaction fixture</h1>
<button type="button" data-esc-builder-preview-action id="slide">Next slide</button>
<div id="native-carousel-track" data-active-slide="0">Carousel content</div>
<button type="button" id="native-prev" aria-controls="native-carousel-track">Previous</button>
<button type="button" id="native-next" aria-controls="native-carousel-track">Next</button>
<button type="button" id="unsafe-mutation" aria-controls="native-carousel-track" data-esc-builder-preview-block="side-effect">Unsafe action</button>
<button type="button" role="tab" aria-selected="false" id="tab">Details tab</button>
<details><summary id="summary">Accordion</summary><p>Accordion content</p></details>
<button type="button" id="unknown">Unapproved action</button>
<form><button type="submit" data-esc-builder-preview-action id="submit">Submit</button></form>
</section>
<section id="unsupported">Unsupported public content</section>
</main>
<footer id="footer-contact">
<p data-esc-vb-footer-field="sodienthoaihanoi">Phone: <a id="footer-phone" href="tel:0123456789"><span data-esc-vb-footer-value>0123456789</span></a></p>
<p data-esc-vb-footer-asset-row="4" data-esc-vb-footer-asset-table="pub_example_07" data-esc-vb-footer-asset-version="${'a'.repeat(64)}"><span data-esc-vb-footer-asset-label>Credit</span>: <a id="footer-credit" href="https://outside.example.test/" data-esc-vb-footer-asset-value>Publisher</a></p>
</footer></body></html>`;

const checks = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const navigations = [];
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    page.on('framenavigated', frame => navigations.push(frame.url()));
    await context.route('**/*', route => route.abort());
    await page.setContent(fixture);
    await page.evaluate(() => { window.__vbExports = {}; });
    for (const script of moduleScripts) await page.addScriptTag({ content: script });
    await page.evaluate(policy => {
      window.__events = { menu: [], footer: [], assets: [], unavailable: [], ui: 0, unknown: 0, submit: 0, mutations: 0, messages: [] };
      const events = window.__events;
      const hooks = window.__vbExports;
      const unavailable = message => events.unavailable.push(message);
      window.__dispose = [
        hooks.installBuilderHeaderNavLock(document, (...value) => events.menu.push(value), true, unavailable),
        hooks.installBuilderFooterSelection(document, value => events.footer.push(value), unavailable, true, (...value) => events.assets.push(value), true),
        hooks.installBuilderEditabilityCues(document, { sample_07: {} }, unavailable, true, true, true),
      ];
      const fakeWindow = { parent: { postMessage: value => events.messages.push(value) } };
      new Function('document', 'Element', 'window', 'parentOrigin', 'NodeFilter',
        'let selectionDispatched=false;\n' + policy)(document, Element, fakeWindow, 'https://admin.example.test', NodeFilter);
      document.getElementById('parent-toggle').addEventListener('click', event => {
        const node = event.currentTarget;
        node.setAttribute('aria-expanded', String(node.getAttribute('aria-expanded') !== 'true'));
      });
      for (const id of ['slide', 'tab', 'summary']) document.getElementById(id).addEventListener('click', () => events.ui++);
      for (const [id, delta] of [['native-prev', -1], ['native-next', 1]]) {
        document.getElementById(id).addEventListener('click', () => {
          const track = document.getElementById('native-carousel-track');
          track.dataset.activeSlide = String(Number(track.dataset.activeSlide || 0) + delta);
          events.ui++;
        });
      }
      document.getElementById('unsafe-mutation').addEventListener('click', () => { events.mutations++; });
      document.getElementById('unknown').addEventListener('click', () => events.unknown++);
      document.getElementById('submit').addEventListener('click', () => events.submit++);
    }, clickPolicy);

    await page.click('#menu-link');
    assert.equal(await page.evaluate(() => window.__events.menu[0]?.[2]), 71);
    assert.equal(await page.getAttribute('#menu-link', 'target'), '_blank');
    await page.click('#parent-toggle');
    assert.equal(await page.getAttribute('#parent-toggle', 'aria-expanded'), 'true');
    await page.click('#parent-toggle', { modifiers: ['Alt'] });
    assert.equal(await page.getAttribute('#parent-toggle', 'aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => window.__events.menu.at(-1)?.[2]), 72);
    await page.click('#footer-phone');
    assert.equal(await page.evaluate(() => window.__events.footer.at(-1)), 'sodienthoaihanoi');
    await page.click('#footer-credit');
    assert.deepEqual(await page.evaluate(() => window.__events.assets.at(-1)), [4, 'pub_example_07', 'a'.repeat(64)]);
    for (const id of ['slide', 'tab', 'summary']) await page.click('#' + id);
    assert.equal(await page.evaluate(() => window.__events.ui), 3);
    await page.click('#native-next');
    assert.equal(await page.getAttribute('#native-carousel-track','data-active-slide'), '1');
    await page.click('#native-prev');
    assert.equal(await page.getAttribute('#native-carousel-track','data-active-slide'), '0');
    assert.equal(await page.evaluate(() => window.__events.ui), 5);
    await page.click('#unsafe-mutation');
    assert.equal(await page.evaluate(() => window.__events.mutations), 0);
    for (const id of ['unknown', 'submit']) await page.click('#' + id);
    assert.equal(await page.evaluate(() => window.__events.unknown + window.__events.submit), 0);
    await page.click('#slide', { modifiers: ['Alt'] });
    assert.equal(await page.evaluate(() => window.__events.ui), 5);
    // Product references can be selected from real cards regardless of
    // their rendered position; no WooCommerce attributes are editable.
    await page.evaluate(() => {
      const root=document.createElement('section');
      root.dataset.tablepressPreview='home_01';
      root.innerHTML='<div data-sale-track>'+
        '<template data-esc-builder-product-template><article data-sale-card data-esc-vb-product-readonly="true">'+
        '<a class="aqua-sale__image-link" href="#"><span class="aqua-sale__discount"></span><img src="/placeholders/product.webp"></a>'+
        '<a class="aqua-sale__name-link" href="#"><h3></h3></a>'+
        '<div class="aqua-sale__prices"><strong></strong><del></del></div>'+
        '<button data-sale-add data-esc-builder-preview-block="cart-mutation"></button></article></template>'+
        '<article id="product-82499" data-sale-card data-esc-vb-product-readonly="true" data-esc-builder-product-id="82499"><a href="/product/a">Product A</a></article>'+
        '<article id="product-82481" data-sale-card data-esc-vb-product-readonly="true" data-esc-builder-product-id="82481"><a href="/product/b">Product B</a></article></div>';
      document.querySelector('main').append(root);
      window.__productMessages=[];
      window.__productDispose=window.__vbExports.installBuilderSectionDrafts(
        document,'https://admin.example.test',value=>window.__productMessages.push(value));
      window.dispatchEvent(new MessageEvent('message', {
        origin:'https://admin.example.test',source:window,
        data:{type:'esc-vb-item-pick-start',tableId:'home_01',sourceRow:null,
          count:3,requestId:27,productIds:['82477','82499','82481']}
      }));
    });
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.matched), true,
      'Product picker must map published cards to ESC Table references');
    await page.click('#product-82499 a');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.row), 1,
      'Source selection must use Product ID, not card position');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.type),
      'esc-vb-item-source-picked');
    assert.equal(await page.locator('#product-82499').getAttribute('data-esc-vb-item-source'),'');
    await page.click('#product-82481 a');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.row), 2,
      'Destination must use exact ESC Table row');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.type),
      'esc-vb-item-target-picked');
    assert.equal(await page.locator('#product-82481').getAttribute('data-esc-vb-item-target'),'');
    await page.evaluate(() => {
      window.dispatchEvent(new MessageEvent('message', {
        origin:'https://admin.example.test',source:window,
        data:{type:'esc-vb-product-order-saved',tableId:'home_01',requestId:29,
          items:[{key:'82481'},{key:'82477'},{key:'82499'}]}
      }));
    });
    assert.equal(await page.locator('[data-sale-track] > [data-sale-card]').first().getAttribute('data-esc-builder-product-id'),'82481',
      'Saved Product reference order must rearrange existing hydrated cards');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.matched),true,
      'Product reorder must be acknowledged');
    // Ordinary Product-card click is a Visual Builder source selection,
    // not a request to edit/read-only WooCommerce attributes or navigate.
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message',{
      origin:'https://admin.example.test',source:window,
      data:{type:'esc-vb-item-pick-clear'}
    })));
    await page.click('#product-82499 a');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.type),
      'esc-vb-product-selected');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.productId),
      '82499', 'Delete source must retain the exact immutable WooCommerce Product ID');
    assert.equal(await page.locator('#product-82499').count(),1,
      'Selection must not remove the Product card before confirmation');
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message',{
      origin:'https://admin.example.test',source:window,
      data:{type:'esc-vb-product-item-deleted',tableId:'home_01',
        productId:'82499',requestId:37}
    })));
    assert.equal(await page.locator('#product-82499').count(),0,
      'A confirmed WordPress deletion removes only its selected Product card');
    assert.equal(await page.locator('#product-82481').count(),1,
      'Other Product cards must be preserved');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.matched),true,
      'Confirmed deletion must acknowledge the exact rendered Product card');
    // A newly saved WooCommerce Product is inserted into the actual Sale
    // carousel without reloading iframe and without synthesizing WP data.
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message',{
      origin:'https://admin.example.test',source:window,
      data:{type:'esc-vb-product-item-added',tableId:'home_01',row:1,requestId:38,
        productOrder:['82481','82485'],product:{
          id:'82485',name:'Product 82485',url:'https://admin.example.test/product/82485',
          image:'https://admin.example.test/product-82485.webp',
          currentPrice:700000,regularPrice:1000000,currency:'VND',
          eligible:true,discountPercent:30
        }}
    })));
    assert.equal(await page.locator('[data-sale-card][data-esc-builder-product-id="82485"]').count(),1,
      'Newly inserted Product must render without iframe reload');
    assert.equal(await page.locator('[data-sale-track] > [data-sale-card]').count(),2,
      'Only two Sale Product cards should exist after delete and insert');
    assert.equal(await page.locator('[data-sale-track] > [data-sale-card]').nth(1)
      .getAttribute('data-esc-builder-product-id'),'82485',
      'Inserted Product follows WordPress reference order');
    assert.equal(await page.locator('[data-esc-builder-product-id="82485"] .aqua-sale__name-link h3')
      .textContent(),'Product 82485','WooCommerce name should appear instantly');
    assert.equal(await page.locator('[data-esc-builder-product-id="82485"] .aqua-sale__discount')
      .textContent(),'-30%','Server-sourced Sale price controls the discount badge');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.matched),true,
      'Inserted Product preview must be acknowledged');
    assert.equal(await page.locator('[data-esc-builder-product-id="82485"]')
      .getAttribute('data-esc-vb-region-state'),'readonly',
      'Live Product card must inherit readonly visual cues immediately');
    await page.hover('[data-esc-builder-product-id="82485"] .aqua-sale__name-link');
    const hoverOutline=await page.locator('[data-esc-builder-product-id="82485"]')
      .evaluate(element=>getComputedStyle(element).outlineStyle);
    assert.equal(hoverOutline,'dashed',
      'Live Product card must show the same dashed border on hover');
    await page.click('[data-esc-builder-product-id="82485"] .aqua-sale__name-link');
    assert.equal(await page.locator('[data-esc-builder-product-id="82485"]')
      .getAttribute('data-esc-vb-product-selected'),'',
      'Live Product card must retain its selected dashed border');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.productId),'82485',
      'New Product card still selects correct canonical Product ID');
    await page.click('#product-82481 a');
    assert.equal(await page.locator('#product-82481')
      .getAttribute('data-esc-vb-product-selected'),'',
      'Existing server-rendered Product card gets identical selected border');
    assert.equal(await page.locator('[data-esc-builder-product-id="82485"]')
      .getAttribute('data-esc-vb-product-selected'),null,
      'Selecting another card clears prior selection highlight');

    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message',{
      origin:'https://admin.example.test',source:window,
      data:{type:'esc-vb-product-item-added',tableId:'home_01',row:1,requestId:39,
        productOrder:['82481','82485'],product:{
          id:'82485',name:'Duplicate',eligible:true,currentPrice:700000,
          regularPrice:1000000
        }}
    })));
    assert.equal(await page.locator('[data-esc-builder-product-id="82485"]').count(),1,
      'Repeated preview message must not duplicate a Product card');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.matched),false,
      'Repeated insert is rejected');


    // A separate Product ESC Table can live inside the decorative home_02
    // section. Its insertion, deletion and saved order must update the actual
    // grid, not the Sale-only [data-sale-track] carousel.
    await page.evaluate(() => {
      const section=document.createElement('section');
      section.dataset.tablepressPreview='home_02';
      section.innerHTML='<div data-esc-source-table="home_02products" data-substrate-products>'+
        '<template data-esc-builder-product-template>'+
        '<article data-substrate-card data-esc-vb-product-readonly="true">'+
        '<a class="aqua-substrate-catalog__image-link" href="#"><div class="aqua-substrate-catalog__image">'+
        '<span class="aqua-substrate-catalog__discount"></span></div></a>'+
        '<a class="aqua-substrate-catalog__name" href="#"></a>'+
        '<div class="aqua-substrate-catalog__prices"><strong></strong><del></del></div>'+
        '<button data-substrate-add></button></article></template>'+
        '<article data-substrate-card id="substrate-82535" data-esc-vb-product-readonly="true" data-esc-builder-product-id="82535"><span>Product 82535</span></article>'+
        '<article data-substrate-card id="substrate-82537" data-esc-vb-product-readonly="true" data-esc-builder-product-id="82537"><span>Product 82537</span></article>'+
        '</div>';
      document.querySelector('main').append(section);
      window.dispatchEvent(new MessageEvent('message',{
        origin:'https://admin.example.test',source:window,
        data:{type:'esc-vb-product-order-saved',tableId:'home_02products',
          items:[{key:'82537'},{key:'82535'}],requestId:42}
      }));
    });
    assert.deepEqual(await page.locator('[data-substrate-products] > [data-substrate-card]')
      .evaluateAll(nodes=>nodes.map(n=>n.dataset.escBuilderProductId)),['82537','82535'],
      'Nested Product ESC Table cards must reorder immediately after a saved swap');
    assert.deepEqual(await page.locator('[data-substrate-products] > [data-substrate-card]')
      .evaluateAll(nodes=>nodes.map(n=>n.dataset.escBuilderRow)),['0','1'],
      'Nested Product rows must be reindexed after reordering');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.matched),true,
      'Nested Product source reorder must acknowledge exact ID mapping');
    // Standard ESC Table picker: red source and blue target are chosen by
    // clicking the existing cards, not by picking IDs from a second panel.
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message',{
      origin:'https://admin.example.test',source:window,
      data:{type:'esc-vb-item-pick-start',tableId:'home_02products',sourceRow:0,
        count:2,requestId:49,productIds:['82537','82535']}
    })));
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.matched),true,
      'Nested Product ESC Table must support the native shared visual picker');
    assert.equal(await page.locator('#substrate-82537').getAttribute('data-esc-vb-item-source'),'',
      'Product source should be outlined red');
    await page.click('#substrate-82535');
    assert.deepEqual(await page.evaluate(() => {
      const item=window.__productMessages.at(-1);
      return [item?.type,item?.tableId,item?.row];
    }),['esc-vb-item-target-picked','home_02products',1],
      'Clicking the Product target must emit the same native item-target event');
    assert.equal(await page.locator('#substrate-82535').getAttribute('data-esc-vb-item-target'),'',
      'Product destination should be outlined blue');
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message',{
      origin:'https://admin.example.test',source:window,
      data:{type:'esc-vb-item-pick-clear'}
    })));

    const nestedCue=await page.locator('#substrate-82537').getAttribute('data-esc-vb-region-label');
    assert(nestedCue?.includes('home_02products')&&nestedCue.includes('Sắp xếp item'),
      'Nested Product must show membership sorting cue, not generic Sale-only readonly guidance');
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message',{
      origin:'https://admin.example.test',source:window,
      data:{type:'esc-vb-product-item-deleted',tableId:'home_02products',
        productId:'82535',requestId:43}
    })));
    assert.equal(await page.locator('#substrate-82535').count(),0,
      'Nested Product deletion must remove exactly the selected card');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.matched),true);
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message',{
      origin:'https://admin.example.test',source:window,
      data:{type:'esc-vb-product-item-added',tableId:'home_02products',
        row:1,requestId:44,productOrder:['82537','82539'],
        product:{id:'82539',name:'Real WordPress Product',url:'https://admin.example.test/p/82539',
          image:'https://admin.example.test/product-82539.webp',
          currentPrice:250000,regularPrice:250000,currency:'VND',eligible:false}}
    })));
    assert.equal(await page.locator('[data-substrate-products] > [data-substrate-card]').count(),2,
      'Nested Product addition should insert an additional card');
    assert.equal(await page.locator('[data-substrate-products] > [data-substrate-card]').last()
      .getAttribute('data-esc-builder-product-id'),'82539',
      'New Product must follow verified WordPress reference order');
    assert.equal(await page.locator('[data-substrate-products] > [data-substrate-card]').last()
      .locator('.aqua-substrate-catalog__name').textContent(),'Real WordPress Product',
      'New Product card must use authoritative WooCommerce name');
    assert.equal(await page.evaluate(() => window.__productMessages.at(-1)?.matched),true,
      'Nested Product insert acknowledgement must be true for non-sale products');
    await page.evaluate(() => {
      window.__productDispose();
      document.querySelector('[data-tablepress-preview="home_01"]').remove();
      document.querySelector('[data-tablepress-preview="home_02"]').remove();
    });
    await page.hover('#footer-phone');
    assert.equal(await page.getAttribute('[data-esc-vb-footer-field]', 'data-esc-vb-region-state'), 'editable');
    await page.screenshot({ path: path.join(output, name + '-editable.png'), fullPage: true });

    await page.evaluate(() => {
      window.__dispose.forEach(dispose => dispose());
      const hooks = window.__vbExports;
      const unavailable = value => window.__events.unavailable.push(value);
      window.__events.menu = []; window.__events.footer = []; window.__events.assets = [];
      hooks.installBuilderHeaderNavLock(document, value => window.__events.menu.push(value), false, unavailable);
      hooks.installBuilderFooterSelection(document, value => window.__events.footer.push(value), unavailable, false, value => window.__events.assets.push(value), false);
      hooks.installBuilderEditabilityCues(document, {}, unavailable, false, false, false);
    });
    await page.click('#menu-link');
    await page.click('#footer-phone');
    await page.click('#footer-credit');
    assert.equal(await page.evaluate(() => window.__events.menu.length + window.__events.footer.length + window.__events.assets.length), 0);
    assert((await page.evaluate(() => window.__events.unavailable.length)) >= 3);
    await page.hover('#footer-phone');
    assert.equal(await page.getAttribute('[data-esc-vb-footer-field]', 'data-esc-vb-region-state'), 'readonly');
    await page.screenshot({ path: path.join(output, name + '-readonly.png'), fullPage: true });
    assert.equal(context.pages().length, 1, 'Preview must not open a new tab');
    assert.equal(requests.length, 0, 'Offline preview must not send external/API requests');
    assert.equal(navigations.length, 0, 'Preview must not navigate');
    checks.push({ viewport: name, header: 'PASS', footer: 'PASS', controls: 'PASS', readonly: 'PASS', navigation: 'BLOCKED' });
    await context.close();
  }
  // Run the shipped WordPress TinyMCE and both actual native preview builders.
  // This editor is entirely synthetic; no admin login, DB save or external request.
  const phpRequire = createRequire(path.join(php, 'tests/esc-table-preview.test.cjs'));
  const builders = phpRequire(path.join(php, 'tests/esc-table-preview.test.cjs')).loadPreviewBuilders();
  const themeRoot = path.join(php, 'wp-content/themes/vibe-code-theme');
  const editorSource = await readFile(path.join(themeRoot, 'inc/tablepress/html.php'), 'utf8');
  const cssBlock = editorSource.match(/\$css = array\(([\s\S]*?)\n    \);/);
  assert(cssBlock, 'Native editor preview styles are missing');
  const editorCSS = [...cssBlock[1].matchAll(/'([^'\r\n]*)'/g)].map(match => match[1]).join('');
  const mceRoot = path.join(php, 'wp-includes/js/tinymce');
  const editorScripts = await Promise.all([
    readFile(path.join(mceRoot, 'tinymce.min.js'), 'utf8'),
    readFile(path.join(mceRoot, 'themes/modern/theme.min.js'), 'utf8'),
    readFile(path.join(mceRoot, 'plugins/noneditable/plugin.min.js'), 'utf8'),
  ]);
  const stylesheet = await readFile(path.join(themeRoot, 'mce.css'), 'utf8');
  const nativeFixture = '<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"></head><body><h1>ESC Table editor fixture</h1><textarea id="native-content"></textarea></body></html>';
  for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [], unexpected = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.href === 'https://editor.example.test/' && route.request().resourceType() === 'document') {
        await route.fulfill({ contentType: 'text/html', body: nativeFixture });
      } else if (url.origin === 'https://editor.example.test' &&
        /^\/tinymce-skin\/(?:skin\.min\.css|content\.min\.css|fonts\/(?:tinymce|tinymce-small)\.(?:woff|ttf|eot|svg))$/.test(url.pathname)) {
        const relative = url.pathname.slice('/tinymce-skin/'.length);
        await route.fulfill({ contentType: relative.endsWith('.css') ? 'text/css' : 'application/octet-stream',
          body: await readFile(path.join(mceRoot, 'skins/lightgray', relative)) });
      } else if (url.origin === 'https://editor.example.test' && url.pathname === '/wp-json/api/image/tablepress') {
        await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#dbeafe"/><text x="20" y="100" fill="#1e3a8a">ESC Table preview</text></svg>' });
      } else { unexpected.push(url.href); await route.abort(); }
    });
    // TinyMCE 4's URI bootstrap cannot initialize on an opaque about:blank URL.
    await page.goto('https://editor.example.test/');
    for (const content of editorScripts) await page.addScriptTag({ content });
    assert.deepEqual(errors, [], 'WordPress TinyMCE bootstrap: ' + errors.join('; '));
    assert.equal(await page.evaluate(() => typeof window.tinymce?.init), 'function');
    await page.evaluate(css => {
      window.tinymce.init({ selector: '#native-content', theme: 'modern', plugins: 'noneditable',
        skin: 'lightgray', skin_url: 'https://editor.example.test/tinymce-skin',
        content_css: false, content_style: css, menubar: false, toolbar: false,
        statusbar: false, width: 300, height: 500,
        init_instance_callback: () => { window.__nativeReady = true; } });
    }, stylesheet + editorCSS);
    await page.waitForFunction(() => window.__nativeReady === true, undefined, { timeout: 10000 });
    await page.locator('#native-content_ifr').waitFor({ state: 'visible', timeout: 10000 });
    for (const [action, build] of Object.entries(builders)) {
      const html = build('section_17', 300, 200);
      await page.evaluate(html => window.tinymce.get('native-content').setContent(html), html);
      await page.waitForFunction(() => {
        const image = window.tinymce.get('native-content').getBody().querySelector('.tablepress-attached-image');
        return image?.complete && image.naturalWidth === 300;
      }, undefined, { timeout: 10000 });
      const result = await page.evaluate(() => {
        const editor = window.tinymce.get('native-content');
        const image = editor.getBody().querySelector('.tablepress-attached-image');
        const box = image.getBoundingClientRect();
        const saved = editor.getContent();
        editor.setContent(saved);
        return { saved, reloaded: editor.getContent(), width: box.width, height: box.height,
          wrappers: editor.getBody().querySelectorAll('.tablepress-preview-wrap').length };
      });
      assert(!/\s(?:style|data-mce-style)\s*=/i.test(result.saved), action + ': serialized preview contains styles');
      assert(!/\s(?:style|data-mce-style)\s*=/i.test(result.reloaded), action + ': preview styles return after reload');
      assert.equal(result.wrappers, 1);
      assert.equal((result.saved.match(/\[table id=section_17 \/\]/g) || []).length, 1);
      assert(result.width > 0 && result.width <= 300 && Math.abs(result.width / result.height - 1.5) < 0.02,
        action + ': editor preview must fit its container without distorting the 300/200 image');
    }
    await page.frameLocator('#native-content_ifr').locator('.tablepress-attached-image').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => window.tinymce.get('native-content').getBody().querySelector('img')?.complete, undefined, { timeout: 10000 });
    await page.screenshot({ path: path.join(output, name + '-native-insertcode.png'), fullPage: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
    assert.equal(context.pages().length, 1);
    checks.push({ viewport: name, nativeInsertCode: 'PASS', nativeReplace: 'PASS', editor: 'WORDPRESS_TINYMCE', serializedStyles: 'NONE', sizing: 'PASS' });
    await context.close();
  }
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ sources, checks, scope: 'OFFLINE_BROWSER_CONTRACT; no production deployment' }, null, 2));
  console.log('AQUATHANHXUAN_ESC_TABLE_INSERTCODE=PASS; native_tinymce=true; viewports=desktop,mobile; no_cms_write=true');
  console.log('AQUATHANHXUAN_VISUAL_BUILDER_BROWSER=PASS; viewports=desktop,mobile; no_build=true; no_ftp=true; no_cms_write=true');
  console.log('SOURCE_SHAS=' + JSON.stringify(sources));
} finally {
  await browser.close();
}
