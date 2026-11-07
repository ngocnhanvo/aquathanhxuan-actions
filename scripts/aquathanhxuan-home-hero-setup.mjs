import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const wpUrl = String(process.env.WP_URL || '').replace(/\/$/, '');
const username = process.env.WP_ADMIN_USERNAME;
const password = process.env.WP_ADMIN_PASSWORD;
if (!wpUrl || !username || !password) throw new Error('Missing WordPress configuration');
if (new URL(wpUrl).hostname !== 'admin.aquathanhxuan.io.vn') throw new Error('Unexpected WordPress origin');

const pageId = 82454;
const assets = [
  {
    url: 'https://aquathanhxuan.com/wp-content/uploads/2024/05/cropped-banner-8-1.png',
    filename: 'cropped-banner-8-1.png',
    slug: 'cropped-banner-8-1',
    alt: 'Banner giới thiệu AQua Thanh Xuân',
  },
  {
    url: 'https://aquathanhxuan.com/wp-content/uploads/2024/05/cropped-banner-6.png',
    filename: 'cropped-banner-6.png',
    slug: 'cropped-banner-6',
    alt: 'Banner sản phẩm AQua Thanh Xuân',
  },
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const fetchRetry = async (url, attempts = 4) => {
  let last;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await fetch(url, { headers: { 'cache-control': 'no-cache', 'user-agent': 'AquaHomeHeroSetup/1.0' } });
      if (response.ok || response.status === 404) return response;
      last = new Error(`HTTP ${response.status}: ${url}`);
    } catch (error) {
      last = error;
    }
    if (i < attempts) await sleep(i * 700);
  }
  throw last || new Error(`Unable to fetch ${url}`);
};

const getJson = async url => {
  const response = await fetchRetry(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
};

const findMedia = async slug => {
  const response = await fetchRetry(`${wpUrl}/wp-json/wp/v2/media?slug=${encodeURIComponent(slug)}&per_page=10&_fields=id,slug,source_url,media_details,title,alt_text`);
  if (!response.ok) return null;
  const list = await response.json();
  return Array.isArray(list) ? list.find(item => item.slug === slug) || null : null;
};

await mkdir('artifacts/home-hero/source', { recursive: true });
for (const asset of assets) {
  asset.local = path.resolve('artifacts/home-hero/source', asset.filename);
  let existing = await findMedia(asset.slug);
  asset.media = existing;
  if (existing) continue;

  let last;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(asset.url, { headers: { 'user-agent': 'Mozilla/5.0 AquaMigration/1.0' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      if (!data.length) throw new Error('empty body');
      await writeFile(asset.local, data);
      last = null;
      break;
    } catch (error) {
      last = error;
      if (attempt < 4) await sleep(attempt * 800);
    }
  }
  if (last) throw new Error(`ASSET_DEFERRED ${asset.filename}: ${last.message}`);
}

const pages = await getJson(`${wpUrl}/wp-json/wp/v2/pages?status=publish&per_page=100&_fields=id,slug,title,acf`);
const productPage = pages.find(item => {
  const lang = item?.acf?.product_lang?.value || item?.acf?.product_lang || 'vi';
  return item?.acf?.key === 'ssr-products' && lang === 'vi';
});
if (!productPage?.slug) throw new Error('Missing VI ssr-products page');
const productPath = '/' + productPage.slug;

const preTable = await fetchRetry(`${wpUrl}/wp-json/tablepress/v1/table/home_00?_qa=${Date.now()}`);
const prePage = await getJson(`${wpUrl}/wp-json/wp/v2/pages/${pageId}?_fields=id,slug,title,content,acf`);
console.log('READ_BEFORE_WRITE=' + JSON.stringify({
  table_exists: preTable.ok,
  page_has_home00: /home_00/i.test(prePage?.content?.rendered || ''),
  product_path: productPath,
  media: assets.map(a => ({ slug: a.slug, exists: Boolean(a.media) })),
}));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  await page.goto(`${wpUrl}/wp-login.php`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill(username);
    await page.locator('#user_pass').fill(password);
    await Promise.all([
      page.waitForURL(url => url.pathname.startsWith('/wp-admin/'), { timeout: 45000 }),
      page.locator('#wp-submit').click(),
    ]);
  }
  if (!page.url().includes('/wp-admin/')) throw new Error('WORDPRESS_LOGIN_FAILED');

  for (const asset of assets) {
    if (!asset.media) {
      await page.goto(`${wpUrl}/wp-admin/media-new.php?browser-uploader`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const fileInput = page.locator('#async-upload');
      await fileInput.waitFor({ state: 'attached' });
      await fileInput.setInputFiles(asset.local);
      const htmlUpload = page.locator('#html-upload');
      await htmlUpload.waitFor({ state: 'visible' });
      await page.waitForFunction(() => {
        const button = document.querySelector('#html-upload');
        return button && !button.disabled;
      }, null, { timeout: 10000 });
      await htmlUpload.click({ noWaitAfter: true });

      for (let poll = 0; poll < 20; poll += 1) {
        asset.media = await findMedia(asset.slug);
        if (asset.media) break;
        await sleep(750);
      }
      if (!asset.media) throw new Error(`MEDIA_UPLOAD_NOT_FOUND ${asset.filename}`);
      console.log(`MEDIA_UPLOAD=PASS filename=${asset.filename} id=${asset.media.id}`);
    }
  }

  let tableResponse = await fetchRetry(`${wpUrl}/wp-json/tablepress/v1/table/home_00?_qa=${Date.now()}`);
  let tableEditUrl = `${wpUrl}/wp-admin/admin.php?page=tablepress&action=edit&table_id=home_00`;

  if (!tableResponse.ok) {
    await page.goto(`${wpUrl}/wp-admin/admin.php?page=tablepress_add`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('input[name="table[name]"]').fill('Trang chủ - Hero');
    await page.locator('textarea[name="table[description]"]').fill('Hero trang chủ AQua Thanh Xuân');
    await page.locator('input[name="table[rows]"]').fill('4');
    await page.locator('input[name="table[columns]"]').fill('13');
    await Promise.all([
      page.waitForURL(/page=tablepress.*action=edit.*table_id=/, { timeout: 45000 }),
      page.getByRole('button', { name: /Add Table|Thêm bảng/i }).click(),
    ]);

    const numericId = new URL(page.url()).searchParams.get('table_id');
    if (!numericId) throw new Error('TABLE_CREATE_NO_ID');
    await page.locator('#table-id').waitFor();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#table-id').fill('home_00');
    await page.locator('#table-id').press('Tab');
    await page.waitForFunction(() => document.querySelector('#table-information-shortcode')?.value?.includes('home_00'));
    tableEditUrl = page.url();
    console.log(`TABLE_CREATE=PASS initial_id=${numericId}`);
  } else {
    await page.goto(tableEditUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }

  await page.locator('#table-id').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.tp?.editor?.options?.data), null, { timeout: 30000 });

  const data = [
    ['image','eyebrow','title','description','primary_label','primary_link','secondary_label','secondary_link','trust_1','trust_2','trust_3','mobile','link'],
    ['Hình ảnh','Nhãn','Tiêu đề','Mô tả','CTA chính','Link CTA chính','CTA phụ','Link CTA phụ','Tin cậy 1','Tin cậy 2','Tin cậy 3','Mobile','Link slide'],
    ['', 'AQua Thanh Xuân', 'Đáp ứng mọi nhu cầu cho bể cá của bạn', '', 'Xem sản phẩm', productPath, '', '', 'Sản phẩm chính hãng', 'Giao hàng nhanh', 'Hỗ trợ 24/7', '', productPath],
    ['', 'AQua Thanh Xuân', 'Sản phẩm chính hãng', 'Nhập khẩu và phân phối chính hãng, được chọn lọc và kiểm tra kỹ trước khi giao tới tay khách hàng.', 'Xem sản phẩm', productPath, '', '', 'Sản phẩm chính hãng', 'Giao hàng nhanh', 'Hỗ trợ 24/7', '', productPath],
  ];

  await page.evaluate((tableData) => {
    window.tp.editor.setData(tableData);
    window.tp.helpers.unsaved_changes.set();
  }, data);

  const insertImage = async (row, mediaId, alt) => {
    await page.evaluate(({ row }) => {
      window.tp.editor.updateSelectionFromCoords(0, row, 0, row);
      window.tp.helpers.selection = { rows: [row], columns: [0] };
    }, { row });

    await page.getByRole('button', { name: /Insert Image/i }).first().click();
    await page.locator('.media-modal').waitFor({ state: 'visible', timeout: 25000 });

    const libraryTab = page.locator('.media-menu-item').filter({ hasText: /Media Library|Thư viện/i }).first();
    if (await libraryTab.count()) await libraryTab.click().catch(() => {});

    const attachment = page.locator(`.attachment[data-id="${mediaId}"]`);
    if (!(await attachment.count())) {
      const search = page.locator('.media-search-input, input[type="search"]').last();
      if (await search.count()) {
        await search.fill(String(mediaId));
        await sleep(800);
      }
    }
    await attachment.waitFor({ state: 'visible', timeout: 25000 });
    await attachment.click();

    const altField = page.locator('.attachment-details [data-setting="alt"] textarea, .attachment-details [data-setting="alt"] input').first();
    if (await altField.count()) {
      await altField.fill(alt);
      await altField.blur();
      await sleep(500);
    }

    await page.locator('.media-button-insert').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.media-button-insert').click();

    await page.waitForFunction(({ row }) => {
      const value = String(window.tp?.editor?.options?.data?.[row]?.[0] || '');
      return /<img\b/i.test(value);
    }, { row }, { timeout: 20000 });

    await page.evaluate(({ row, origin, alt }) => {
      let value = String(window.tp.editor.options.data[row][0] || '');
      value = value.replaceAll(origin, '');
      if (!/\balt=(["'])[^"']*\1/i.test(value)) {
        value = value.replace(/<img\b/i, `<img alt="${alt.replaceAll('"', '&quot;')}"`);
      }
      window.tp.editor.setValueFromCoords(0, row, value);
      window.tp.helpers.unsaved_changes.set();
    }, { row, origin: wpUrl, alt });
  };

  await insertImage(2, assets[0].media.id, assets[0].alt);
  await insertImage(3, assets[1].media.id, assets[1].alt);

  const saveButton = page.getByRole('button', { name: /Save Changes|Lưu thay đổi/i }).first();
  await saveButton.click();
  await page.waitForFunction(() => !window.tp?.made_changes, null, { timeout: 30000 });

  tableResponse = await fetchRetry(`${wpUrl}/wp-json/tablepress/v1/table/home_00?_qa=${Date.now()}`);
  if (!tableResponse.ok) throw new Error(`TABLE_READBACK_HTTP_${tableResponse.status}`);
  const table = await tableResponse.json();
  if (!Array.isArray(table.items) || table.items.length !== 2) throw new Error('TABLE_READBACK_ITEM_COUNT');
  for (const [index, item] of table.items.entries()) {
    if (!/<img\b/i.test(String(item.image || ''))) throw new Error(`TABLE_IMAGE_MISSING_${index}`);
    if (String(item.image || '').includes(wpUrl)) throw new Error(`TABLE_IMAGE_NOT_RELATIVE_${index}`);
    if (!/\balt=(["'])[^"']+\1/i.test(String(item.image || ''))) throw new Error(`TABLE_IMAGE_ALT_MISSING_${index}`);
  }
  console.log('TABLE_READBACK=PASS id=home_00 items=2 images=2 relative_src=true alt=true');

  await page.goto(`${wpUrl}/wp-admin/post.php?post=${pageId}&action=edit`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const content = page.locator('#content');
  await content.waitFor({ state: 'attached', timeout: 30000 });
  const current = await content.inputValue();

  if (!/home_00/i.test(current)) {
    if (await page.locator('#content-html').count()) await page.locator('#content-html').click();
    await page.locator('#tablepress_quicktags_button').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#tablepress_quicktags_button').click();
    await page.locator('#TB_iframeContent').waitFor({ state: 'visible', timeout: 20000 });
    const picker = page.frameLocator('#TB_iframeContent');
    const insert = picker.locator('.insert-shortcode[title*="home_00"]').first();
    await insert.waitFor({ state: 'visible', timeout: 20000 });
    await insert.click();
    await page.waitForFunction(() => /home_00/i.test(document.querySelector('#content')?.value || ''), null, { timeout: 20000 });

    const update = page.locator('#publish');
    await Promise.all([
      page.waitForLoadState('domcontentloaded').catch(() => {}),
      update.click(),
    ]);
    console.log('PAGE_INSERT=PASS method=native_tablepress_insert_shortcode');
  } else {
    console.log('PAGE_INSERT=SKIP_ALREADY_PRESENT');
  }

  const verifyPage = await getJson(`${wpUrl}/wp-json/wp/v2/pages/${pageId}?_fields=id,slug,content,modified_gmt`);
  if (!/home_00/i.test(verifyPage?.content?.rendered || '')) throw new Error('PAGE_READBACK_HOME00_MISSING');

  await mkdir('artifacts/home-hero', { recursive: true });
  await page.screenshot({ path: 'artifacts/home-hero/wordpress-home-page-editor.png', fullPage: true });
  console.log('HOME_HERO_CMS_SETUP=PASS page_id=82454 table=home_00 assets=2');
} finally {
  await browser?.close().catch(() => {});
}
