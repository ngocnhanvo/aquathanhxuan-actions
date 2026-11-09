// Add one editable WordPress Menu Manager custom child "Tất cả" for each Header parent.
// No parent/category edits. Idempotent, scoped to native menu #1778.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const origin = 'https://admin.aquathanhxuan.io.vn';
const menuId = 1778;
const expectedParents = 11;
const output = 'artifacts/header-all-link';
fs.mkdirSync(output, {recursive: true});
const journal = {menuId, changed: [], reused: [], status: 'STARTED'};
const persist = () => fs.writeFileSync(output + '/result.json', JSON.stringify(journal, null, 2) + '\n');
const name = v => String(v || '').normalize('NFKC').trim().toLowerCase();
const title = item => item.title?.raw || item.title?.rendered || item.title || '';
const path = v => {
  let value = String(v || '').trim();
  if (/^https?:\/\//i.test(value)) value = new URL(value).pathname;
  return value.replace(/\/+$/, '') || '/';
};
let browser;
(async () => {
  assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD, 'WP credentials missing');
  browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
  const page = await browser.newPage();
  await page.goto(origin + '/wp-login.php', {waitUntil: 'domcontentloaded', timeout: 60000});
  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
    await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
    await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u => u.pathname.startsWith('/wp-admin/'), {timeout: 45000});
  const nonceResponse = await page.request.get(origin + '/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceResponse.status(), 200, 'Cannot authenticate REST writer');
  const nonce = (await nonceResponse.text()).trim();
  assert(nonce, 'REST nonce missing');
  const headers = {'X-WP-Nonce': nonce, Accept: 'application/json', 'Cache-Control': 'no-cache'};
  const request = async (endpoint, payload) => {
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await (payload === undefined
        ? page.request.get(origin + endpoint, {headers, timeout: 25000})
        : page.request.post(origin + endpoint, {headers, data: payload, timeout: 25000}));
      if (![429, 502, 503, 504].includes(response.status())) break;
      await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
    }
    const text = await response.text();
    if (!response.ok()) throw new Error('REST ' + endpoint + ' HTTP ' + response.status() + ' ' + text.slice(0, 160));
    return JSON.parse(text);
  };
  const allItems = async () => {
    const list = [];
    for (let n = 1; n <= 10; n++) {
      const part = await request('/wp-json/wp/v2/menu-items?context=edit&menus=' + menuId + '&per_page=100&page=' + n + '&_ts=' + Date.now());
      assert(Array.isArray(part), 'Menu response not array');
      list.push(...part);
      if (part.length < 100) return list;
    }
    throw new Error('Menu pagination unexpected');
  };
  const menu = await request('/wp-json/wp/v2/menus/' + menuId + '?context=edit');
  assert.equal(menu.name, 'Header VI', 'Unexpected menu identity');
  let items = await allItems();
  const parents = items.filter(item => Number(item.parent) === 0);
  assert.equal(parents.length, expectedParents, 'WordPress root count changed');
  for (const parent of parents) {
    assert(Number.isInteger(parent.id), 'Invalid parent ID');
    const children = items.filter(item => Number(item.parent) === parent.id);
    assert(children.length, 'Header parent has no child ' + parent.id);
    assert(path(parent.url).startsWith('/san-pham/'), 'Unexpected parent URL ' + parent.id);
    const matches = children.filter(item => name(title(item)) === name('Tất cả'));
    assert(matches.length <= 1, 'Duplicate Tất cả under ' + parent.id);
    if (matches.length) {
      assert.equal(path(matches[0].url), path(parent.url), 'Existing Tất cả URL mismatch');
      journal.reused.push(matches[0].id);
    }
  }
  fs.writeFileSync(output + '/before.json', JSON.stringify({
    parents: parents.map(item => ({id: item.id, title: title(item), url: item.url, order: item.menu_order})),
    childCounts: parents.map(parent => items.filter(item => Number(item.parent) === parent.id).length)
  }, null, 2) + '\n');
  journal.status = 'PREFLIGHT_PASS';
  persist();
  console.log('HEADER_ALL_PREFLIGHT_PASS=' + JSON.stringify({parents: parents.length, menuId, existing: items.length}));
  for (const parent of parents) {
    if (journal.reused.some(id => items.some(item => item.id === id && Number(item.parent) === parent.id))) continue;
    const created = await request('/wp-json/wp/v2/menu-items', {
      title: 'Tất cả', type: 'custom', url: parent.url,
      menus: menuId, parent: parent.id, status: 'publish', menu_order: 1
    });
    assert(Number.isInteger(created.id) && Number(created.parent) === parent.id &&
      Number(created.menus) === menuId && name(title(created)) === name('Tất cả') &&
      path(created.url) === path(parent.url), 'Menu child response mismatch ' + parent.id);
    journal.changed.push({parentId: parent.id, menuItemId: created.id, url: parent.url});
    persist();
    console.log('HEADER_ALL_CREATED=' + parent.id + ':' + created.id);
  }
  items = await allItems();
  const rootReadback = items.filter(item => Number(item.parent) === 0);
  assert.equal(rootReadback.length, expectedParents, 'Menu parents lost after update');
  const expectedByParent = new Map();
  for (const parent of parents) {
    const matches = items.filter(item => Number(item.parent) === parent.id && name(title(item)) === name('Tất cả'));
    assert.equal(matches.length, 1, 'Tất cả readback missing or duplicate ' + parent.id);
    assert.equal(path(matches[0].url), path(parent.url), 'Tất cả changed destination ' + parent.id);
    expectedByParent.set(parent.id, matches[0].id);
  }
  const canonical = await request('/wp-json/esc-api/v1/menus?header_all=' + Date.now());
  const roots = canonical?.menus?.Header?.vi?.items;
  assert(Array.isArray(roots) && roots.length === expectedParents, 'Canonical Header roots mismatched');
  const byId = new Map(items.map(item => [Number(item.id), item]));
  journal.reordered = [];
  journal.expectedOrder = {};
  for (const parent of parents) {
    const root = roots.find(item => Number(item.id) === parent.id);
    assert(root && Array.isArray(root.children), 'Canonical parent missing ' + parent.id);
    const all = root.children.filter(item => name(item.label) === name('Tất cả'));
    assert.equal(all.length, 1, 'Canonical Tất cả duplicate/missing ' + parent.id);
    const child = all[0];
    assert.equal(Number(child.id), expectedByParent.get(parent.id), 'Canonical item ID mismatch');
    assert.equal(path(child.href || child.slug).replace(/^[/]/, ''), path(parent.url).replace(/^[/]/, ''), 'Canonical Tất cả href mismatch');
    const desired = [child, ...root.children.filter(item => Number(item.id) !== Number(child.id))];
    journal.expectedOrder[parent.id] = desired.map(item => Number(item.id));
    for (let index = 0; index < desired.length; index++) {
      const id = Number(desired[index].id);
      const original = byId.get(id);
      assert(original && Number(original.parent) === parent.id, 'Order scope parent mismatch ' + id);
      const targetOrder = index + 1;
      if (Number(original.menu_order) === targetOrder) continue;
      const updated = await request('/wp-json/wp/v2/menu-items/' + id, {menu_order: targetOrder});
      assert.equal(Number(updated.id), id, 'Menu order update ID mismatch');
      assert.equal(Number(updated.parent), parent.id, 'Menu order update parent mismatch');
      assert.equal(Number(updated.menu_order), targetOrder, 'Menu order update value mismatch');
      byId.set(id, updated);
      journal.reordered.push({id, parentId: parent.id, previousOrder: Number(original.menu_order), targetOrder});
      persist();
    }
  }
  const verified = await request('/wp-json/esc-api/v1/menus?header_all_verified=' + Date.now());
  const finalRoots = verified?.menus?.Header?.vi?.items;
  assert(Array.isArray(finalRoots) && finalRoots.length === expectedParents, 'Final Header roots changed');
  for (const parent of parents) {
    const root = finalRoots.find(item => Number(item.id) === parent.id);
    assert(root && Array.isArray(root.children), 'Final root missing ' + parent.id);
    assert.deepEqual(root.children.map(item => Number(item.id)), journal.expectedOrder[parent.id],
      'Tất cả must be first and prior child order preserved under ' + parent.id);
    assert.equal(name(root.children[0].label), name('Tất cả'));
  }
  journal.status = 'PASS';
  journal.finishedAt = new Date().toISOString();
  journal.childCounts = finalRoots.map(root => root.children.length);
  persist();
  console.log('HEADER_ALL_CMS_PASS=' + JSON.stringify({
    parents: expectedParents, added: journal.changed.length,
    reused: journal.reused.length, reordered: journal.reordered.length, firstChild: 'Tất cả', childCounts: journal.childCounts
  }));
})().catch(error => {
  journal.status = 'FAILED';
  journal.error = String(error?.stack || error);
  persist();
  console.error('HEADER_ALL_CMS_FAIL=' + journal.error);
  process.exitCode = 1;
}).finally(async () => { await browser?.close().catch(() => {}); });
