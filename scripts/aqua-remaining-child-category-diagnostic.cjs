'use strict';
/** Read-only: trace unexpected public cards to original Woo Product IDs and category trees. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const SOURCE = 'https://aquathanhxuan.com';
const WP = 'https://admin.aquathanhxuan.io.vn';
const PUBLIC = 'https://aquathanhxuan.io.vn';
const OUT = 'artifacts/aqua-remaining-child-diagnostic';
fs.mkdirSync(OUT, { recursive: true });
const report = { source: SOURCE, target: WP, public: PUBLIC, slug: 'may-loc-loc-treo', state: 'STARTED' };
const save = () => fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2) + '\n');
const norm = x => String(x || '').normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ');
async function source(url) {
  const r = await fetch(SOURCE + url, { signal: AbortSignal.timeout(45000) });
  assert.equal(r.status, 200, 'Original REST HTTP ' + r.status + ' ' + url);
  return r.json();
}
async function paged(get, endpoint, max = 100) {
  const output = [];
  for (let page = 1; page <= max; page++) {
    const rows = await get(endpoint + (endpoint.includes('?') ? '&' : '?') + 'per_page=100&page=' + page);
    assert(Array.isArray(rows), 'REST list expected: ' + endpoint);
    output.push(...rows);
    if (rows.length < 100) return output;
  }
  throw Error('Pagination limit: ' + endpoint);
}
async function main() {
  assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD, 'CMS credentials unavailable');
  const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    await page.goto(WP + '/wp-login.php', {waitUntil: 'domcontentloaded', timeout: 60000});
    if (await page.locator('#user_login').count()) {
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(u => u.pathname.startsWith('/wp-admin/'), {timeout: 50000});
    const nonce = await page.request.get(WP + '/wp-admin/admin-ajax.php?action=rest-nonce');
    assert.equal(nonce.status(), 200, 'Missing REST nonce');
    const headers = {'X-WP-Nonce': (await nonce.text()).trim()};
    const target = async path => {
      const r = await page.request.get(WP + path, {headers, timeout: 45000});
      assert.equal(r.status(), 200, 'WordPress REST HTTP ' + r.status() + ' ' + path);
      return r.json();
    };
    const [sourceCats, targetCats, originalRoots, targetProducts] = await Promise.all([
      paged(source, '/wp-json/wc/store/v1/products/categories', 30),
      paged(target, '/wp-json/wc/v3/products/categories', 30),
      paged(source, '/wp-json/wc/store/v1/products?category=1809', 20),
      paged(target, '/wp-json/wc/v3/products?status=publish&orderby=id&order=asc', 150),
    ]);
    const targetCategory = targetCats.find(c => c.slug === report.slug);
    assert(targetCategory, 'Target category missing');
    const sourceCandidates = sourceCats.filter(c => Number(c.parent || 0) === 1809
      && (c.slug === targetCategory.slug || norm(c.name) === norm(targetCategory.name)));
    const sourceTreo = sourceCats.filter(c => Number(c.parent || 0) === 1809 &&
      (norm(c.name).includes('treo') || String(c.slug).includes('treo')));
    report.targetCategory = {id: targetCategory.id, name: targetCategory.name, parent: targetCategory.parent, slug: targetCategory.slug};
    report.sourceCandidates = sourceCandidates.map(c => ({id:c.id, name:c.name, parent:c.parent, slug:c.slug}));
    report.sourceTreo = sourceTreo.map(c => ({id:c.id, name:c.name, parent:c.parent, slug:c.slug}));
    assert.equal(sourceCandidates.length, 1, 'Ambiguous original child name/slug; review diagnostic sourceCandidates');
    const chosen = sourceCandidates[0];
    const branchIds = new Set([Number(chosen.id)]);
    let changed = true;
    while(changed) {
      changed = false;
      for (const c of sourceCats) if (branchIds.has(Number(c.parent||0)) && !branchIds.has(Number(c.id))) {
        branchIds.add(Number(c.id));changed=true;
      }
    }
    const bySourceId = new Map(originalRoots.map(p => [Number(p.id), p]));
    const byTargetId = new Map(targetProducts.map(p => [Number(p.id), p]));
    const byTargetSlug = new Map(targetProducts.map(p => [String(p.slug), p]));
    const directProducts = originalRoots.filter(p => (p.categories||[]).some(c => Number(c.id) === Number(chosen.id)));
    const branchProducts = originalRoots.filter(p => (p.categories||[]).some(c => branchIds.has(Number(c.id))));
    const directIds = new Set(directProducts.map(p => Number(byTargetSlug.get(p.slug)?.id)));
    const branchIdsTarget = new Set(branchProducts.map(p => Number(byTargetSlug.get(p.slug)?.id)));
    report.source = {rootCount: originalRoots.length, directCount: directProducts.length,
      branchCount: branchProducts.length, descendants:[...branchIds].map(id=>sourceCats.find(c=>Number(c.id)===id)).filter(Boolean)
        .map(c=>({id:c.id,slug:c.slug,name:c.name,parent:c.parent}))};
    const response = await page.goto(PUBLIC + '/san-pham/' + report.slug, {waitUntil:'domcontentloaded', timeout:60000});
    assert.equal(response?.status(), 200, 'Public URL not HTTP 200');
    const renderedIds = await page.locator('article[data-catalog-product]')
      .evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('data-catalog-product'))));
    report.rendered = renderedIds.map(id => {
      const p = byTargetId.get(id);
      const origin = (p?.meta_data||[]).find(x=>x.key==='_esc_origin_product_id')?.value;
      const sourceProduct=bySourceId.get(Number(origin));
      return {targetId:id,slug:p?.slug,name:p?.name,originProductId:origin??null,
        direct:directIds.has(id),branch:branchIdsTarget.has(id),
        originRoot:!!sourceProduct,sourceCategories:(sourceProduct?.categories||[]).map(c=>({id:c.id,name:c.name,slug:c.slug})),
        targetCategories:(p?.categories||[]).map(c=>({id:c.id,name:c.name,slug:c.slug}))};
    });
    report.unexpectedDirect = report.rendered.filter(x=>!x.direct);
    report.unexpectedBranch = report.rendered.filter(x=>!x.branch);
    report.state='PASS';save();
    console.log('AQUA_CHILD_CATEGORY_DIAGNOSTIC_PASS=' + JSON.stringify({
      target: report.targetCategory,sourceTerm:chosen.id,sourceDirect:directProducts.length,
      sourceBranch:branchProducts.length,rendered:renderedIds.length,
      unexpectedDirect:report.unexpectedDirect,unexpectedBranch:report.unexpectedBranch
    }));
  } finally { await browser.close(); }
}
main().catch(e=>{report.state='FAIL';report.error=String(e.stack||e).slice(0,3000);save();
  console.error('AQUA_CHILD_CATEGORY_DIAGNOSTIC_FAIL='+report.error);process.exitCode=1;});
