// Update only the two existing ACF contact-channel fields on the verified
// Aqua Thanh Xuân WordPress information post. No other post/meta may be edited.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const wp = 'https://admin.aquathanhxuan.io.vn';
const site = 'https://aquathanhxuan.io.vn';
const legacyFacebook = 'https://www.facebook.com/aquathanhxuan.hn/';
const legacyZaloLabel = '1900.666.888';
const postId = 62; // verified from public thong-tin-chung REST source.
assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD, 'Missing WordPress admin login');
const fields = { facebook: legacyFacebook, zalo: legacyZaloLabel };
(async () => {
  const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
  const page = await browser.newPage();
  page.setDefaultTimeout(22000);
  const field = name => page.locator('.acf-field[data-name="' + name + '"] input[type="text"], .acf-field[data-name="' + name + '"] input[type="url"]').first();
  const enterEdit = async () => {
    await page.goto(wp + '/wp-admin/post.php?post=' + postId + '&action=edit', {waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(new URL(page.url()).hostname, 'admin.aquathanhxuan.io.vn', 'Unexpected WordPress host');
    assert(await page.locator('#post').count() > 0 || await page.locator('#poststuff').count() > 0, 'Not a native WP post editor');
    for (const name of Object.keys(fields)) {
      assert.equal(await field(name).count(), 1, 'Missing ACF field ' + name + ': no mutation');
    }
  };
  try {
    assert.equal(new URL(site).hostname, 'aquathanhxuan.io.vn');
    await page.goto(wp + '/wp-login.php', {waitUntil:'domcontentloaded',timeout:60000});
    if (await page.locator('#user_login').count()) {
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(url => url.pathname.startsWith('/wp-admin/'), {timeout:45000});
    await enterEdit();
    const before = {};
    for (const name of Object.keys(fields)) before[name] = (await field(name).inputValue()).trim();
    console.log('CONTACT_CMS_BEFORE=' + JSON.stringify(before));
    const unsafe = Object.keys(fields).filter(name => before[name] && before[name] !== fields[name]);
    assert.deepEqual(unsafe, [], 'Existing contact channels differ from legacy reference; refuse overwrite');
    if (Object.keys(fields).every(name => before[name] === fields[name])) {
      console.log('CONTACT_CMS_PASS=UNCHANGED');
      return;
    }
    for (const [name, value] of Object.entries(fields)) await field(name).fill(value);
    const publish = page.locator('#publish').first();
    assert(await publish.count(), 'Native Update/Publish button missing: refuse alternative write path');
    await publish.click();
    await page.waitForLoadState('domcontentloaded', {timeout:45000});
    await enterEdit();
    const after = {};
    for (const name of Object.keys(fields)) after[name] = (await field(name).inputValue()).trim();
    assert.deepEqual(after, fields, 'Native WordPress ACF read-after-write mismatch');
    const res = await page.request.get(wp + '/wp-json/wp/v2/thong-tin-chung?per_page=20&status=publish');
    assert.equal(res.status(), 200, 'Public WordPress info REST failed');
    const posts = await res.json();
    const record = posts.find(x => x.id === postId);
    assert(record, 'Public canonical info post missing');
    assert.equal(record.acf?.facebook, fields.facebook, 'Public REST Facebook not updated');
    assert.equal(record.acf?.zalo, fields.zalo, 'Public REST Zalo label not updated');
    console.log('CONTACT_CMS_PASS=UPDATED ' + JSON.stringify(after));
  } catch(e) {
    console.error('CONTACT_CMS_FAIL=' + e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(e=>{console.error('CONTACT_CMS_FATAL='+e.message);process.exitCode=1;});
