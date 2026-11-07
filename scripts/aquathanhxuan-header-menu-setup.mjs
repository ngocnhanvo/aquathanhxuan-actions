import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const wpUrl = String(process.env.WP_URL || '').replace(/\/$/, '');
const username = process.env.WP_ADMIN_USERNAME;
const password = process.env.WP_ADMIN_PASSWORD;
if (!wpUrl || !username || !password) throw new Error('Missing WordPress configuration');

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .replace(/[^a-zA-Z0-9]+/g, ' ')
  .trim()
  .toLowerCase();

const desired = [
  ['thuong-hieu', 'Thương hiệu', ['THƯƠNG HIỆU']],
  ['den', 'Đèn', ['ĐÈN']],
  ['may-loc', 'Máy lọc', ['MÁY LỌC']],
  ['vat-lieu-loc', 'Vật liệu lọc', ['VẬT LIỆU LỌC']],
  ['phu-kien', 'Phụ kiện', ['PHỤ KIỆN']],
  ['da-lua-cat', 'Đá / Lũa / Cát', ['ĐÁ, LŨA VÀ CÁT', 'ĐÁ LŨA VÀ CÁT']],
  ['hoa-chat', 'Hóa chất', ['HÓA CHẤT']],
  ['be-kinh', 'Bể kính', ['BỂ KÍNH VÀ CHÂN', 'BỂ KÍNH']],
  ['nen', 'Nền', ['NỀN']],
  ['co2', 'CO2', ['CO2 VÀ PHỤ KIỆN', 'CO2']],
  ['sinh-vat', 'Sinh vật', ['CÂY VÀ CÁ THỦY SINH', 'CÂY VÀ CÁ THUỶ SINH']],
];

const fetchRetry = async (url, attempts = 8) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}: ${url}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(5000, attempt * 750)));
  }
  throw lastError || new Error(`Unable to fetch: ${url}`);
};

const categoryResponse = await fetchRetry(`${wpUrl}/wp-json/astro/v1/get-product-categories`);
const categories = await categoryResponse.json();
if (!Array.isArray(categories) || !categories.length) throw new Error('No product categories returned');

const byName = new Map(categories.map((item) => [normalize(item.name), item]));
const matched = desired.map(([key, label, names]) => {
  const category = names.map((name) => byName.get(normalize(name))).find(Boolean);
  if (!category?.slug) throw new Error(`Missing product category for menu: ${label}`);
  return { key, label, category };
});

const pagesResponse = await fetchRetry(`${wpUrl}/wp-json/wp/v2/pages?status=publish&per_page=100&_fields=id,slug,acf,title`);
const pages = await pagesResponse.json();
const productPage = pages.find((page) => {
  const lang = page?.acf?.product_lang?.value || page?.acf?.product_lang || 'vi';
  return page?.acf?.key === 'ssr-products' && lang === 'vi';
});
if (!productPage?.slug) throw new Error('Missing vi ssr-products Page');

const menuTree = matched.map(({ key, label, category }) => ({
  key,
  lang: 'vi',
  label,
  slug: `/${productPage.slug}/${category.slug}`,
  linkMode: 'custom',
}));

const currentMenuResponse = await fetchRetry(`${wpUrl}/wp-json/esc-api/v1/menus?_preflight=${Date.now()}`);
const currentMenuPayload = await currentMenuResponse.json();
const currentHeader = currentMenuPayload?.menus?.Header?.vi;
const currentItems = Array.isArray(currentHeader?.items) ? currentHeader.items : [];
const sameMenu = currentItems.length === menuTree.length && menuTree.every((expected, index) => {
  const actual = currentItems[index] || {};
  return String(actual.label || '') === expected.label
    && String(actual.slug || '') === expected.slug;
});

if (sameMenu) {
  console.log(`HEADER_MENU_SETUP=PASS status=SKIP_UNCHANGED items=${menuTree.length}`);
  process.exit(0);
}

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await page.goto(`${wpUrl}/wp-login.php`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill(username);
    await page.locator('#user_pass').fill(password);
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith('/wp-admin/'), { timeout: 45000 }),
      page.locator('#wp-submit').click(),
    ]);
  }
  if (!page.url().includes('/wp-admin/')) throw new Error('WORDPRESS_LOGIN_FAILED');

  const editorUrl = `${wpUrl}/wp-admin/nav-menus.php`;
  await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

  let menuId = 0;
  const selector = page.locator('#select-menu-to-edit');
  if (await selector.count()) {
    const ids = await selector.locator('option').evaluateAll((options) =>
      options.map((option) => Number(option.value)).filter((id) => Number.isSafeInteger(id) && id > 0)
    );
    for (const id of ids) {
      await page.goto(`${editorUrl}?action=edit&menu=${id}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const code = await page.locator('#esc-menu-code').inputValue().catch(() => '');
      const lang = await page.locator('#esc-menu-lang').inputValue().catch(() => '');
      if (code.trim().toLowerCase() === 'header' && lang === 'vi') {
        menuId = id;
        break;
      }
    }
  }

  if (!menuId) {
    await page.goto(`${editorUrl}?action=edit&menu=0`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('#menu-name').fill('Header VI');
    const create = page.locator('#save_menu_header');
    await Promise.all([
      page.waitForURL(/nav-menus\.php.*menu=\d+/, { timeout: 45000 }),
      create.click(),
    ]);
    menuId = Number(new URL(page.url()).searchParams.get('menu') || 0);
    if (!menuId) throw new Error('Menu creation did not return an ID');
  }

  await page.goto(`${editorUrl}?action=edit&menu=${menuId}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('#esc-menu-code').fill('Header');
  await page.locator('#esc-menu-lang').selectOption('vi');
  await page.locator('#esc-menu-type').selectOption('dropdown');
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.locator('#save_menu_header').click(),
  ]);

  await page.locator('#esc-pse-menu-json-input').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#esc-pse-menu-json-input').fill(JSON.stringify(menuTree));
  await page.locator('#esc-pse-menu-json-preview').click();
  await page.locator('#esc-pse-menu-json-replace').waitFor({ state: 'visible', timeout: 20000 });
  const preview = await page.locator('#esc-pse-menu-json-result').textContent();
  if (!String(preview || '').includes(`${menuTree.length} items hợp lệ`)) {
    throw new Error(`Unexpected menu preview: ${String(preview || '').slice(0, 400)}`);
  }

  page.once('dialog', (dialog) => dialog.accept());
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.locator('#esc-pse-menu-json-replace').click(),
  ]);

  const verifyResponse = await fetch(`${wpUrl}/wp-json/esc-api/v1/menus?_qa=${Date.now()}`);
  if (!verifyResponse.ok) throw new Error(`Menu API verify failed: ${verifyResponse.status}`);
  const verify = await verifyResponse.json();
  const header = verify?.menus?.Header?.vi;
  if (!header || !Array.isArray(header.items)) throw new Error('Header/vi menu not returned by API');
  const labels = header.items.map((item) => String(item.label || ''));
  for (const item of menuTree) {
    if (!labels.includes(item.label)) throw new Error(`Menu API missing item: ${item.label}`);
  }

  await mkdir('artifacts/header-menu', { recursive: true });
  await page.screenshot({ path: 'artifacts/header-menu/wordpress-menu.png', fullPage: true });
  console.log(`HEADER_MENU_SETUP=PASS menu_id=${menuId} product_page=${productPage.slug} items=${menuTree.length}`);
} finally {
  await browser?.close().catch(() => {});
}
