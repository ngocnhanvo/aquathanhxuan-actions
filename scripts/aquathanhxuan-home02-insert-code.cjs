const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const env = Object.fromEntries((process.env.ENV_FILE || '').split(/\r?\n/)
  .map(line => line.match(/^\s*(WC_URL)\s*=\s*(.*?)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));
assert.equal(env.WC_URL, 'https://admin.aquathanhxuan.io.vn');
assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD, 'WordPress secrets missing');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(16000);
  page.on('dialog', async dialog => {
    if (dialog.type() === 'beforeunload') await dialog.accept();
    else await dialog.dismiss();
  });
  const shortcode = '[table id=home_02 /]';
  try {
    await page.goto(env.WC_URL + '/wp-login.php', { waitUntil: 'domcontentloaded' });
    if (await page.locator('#user_login').count()) {
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(url => url.pathname.startsWith('/wp-admin/'));
    const editUrl = env.WC_URL + '/wp-admin/post.php?post=82454&action=edit&esc_full_admin=1';
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.tinymce?.get('content')?.getBody?.(), null, { timeout: 20000 });
    const before = await page.locator('#content').inputValue();
    console.log('HOME02_PRECHECK=' + JSON.stringify({
      length: before.length, has00: before.includes('home_00'),
      has01: before.includes('home_01'), has02: before.includes('home_02')
    }));
    assert(before.includes('home_00') && before.includes('home_01'), 'existing sections missing');
    if (before.includes(shortcode)) {
      assert.equal(before.split(shortcode).length - 1, 1, 'pre-existing duplicate home_02');
      console.log('HOME02_INSERT_CODE=PASS_ALREADY_PRESENT');
      return;
    }

    // Native TablePress TinyMCE toolbar button must be clicked in an ACTIVE Visual editor.
    // A direct call to tablepress_open_shortcode_thickbox from Text mode leaves
    // WordPress send_to_editor without a usable TinyMCE selection (prior run).
    const visualTab = page.locator('#content-tmce');
    if (!(await visualTab.getAttribute('class') || '').includes('switch-tmce')) {
      throw new Error('WordPress Visual editor tab missing');
    }
    await visualTab.click();
    await page.waitForFunction(() => {
      const editor = window.tinymce?.get('content');
      return !!editor && !editor.isHidden() && !!editor.getBody();
    }, null, { timeout: 15000 });
    await page.evaluate(() => {
      const ed = window.tinymce.get('content');
      ed.focus();
      ed.selection.select(ed.getBody(), true);
      ed.selection.collapse(false);
      window.wpActiveEditor = 'content';
    });
    const toolbar = page.locator('#content_tablepress_insert_table, [id$="_tablepress_insert_table"]').first();
    if (!await toolbar.count()) {
      const ids = await page.locator('[id*="tablepress"]').evaluateAll(nodes => nodes.slice(0, 20).map(el => el.id));
      throw new Error('Native TinyMCE Insert Code button not found: ' + JSON.stringify(ids));
    }
    await toolbar.click();
    const frame = page.frameLocator('#TB_iframeContent');
    const picker = frame.locator('input.insert-shortcode[title="[table id=home_02 /]"]');
    await picker.waitFor({ state: 'visible', timeout: 15000 });
    assert.equal(await picker.getAttribute('title'), shortcode);
    await picker.click();

    await page.waitForTimeout(650);
    const editorState = await page.evaluate(() => {
      const ed = window.tinymce.get('content');
      return {
        active: window.wpActiveEditor, hidden: ed.isHidden(),
        rich: ed.getContent(), textarea: document.getElementById('content').value
      };
    });
    console.log('HOME02_NATIVE_INSERT=' + JSON.stringify({
      active: editorState.active, hidden: editorState.hidden,
      richHas02: editorState.rich.includes(shortcode),
      textHas02: editorState.textarea.includes(shortcode),
      richTail: editorState.rich.slice(-220)
    }));
    assert(editorState.rich.includes(shortcode) || editorState.textarea.includes(shortcode),
      'Native Insert Code did not update active editor; page intentionally NOT SAVED');
    await page.evaluate(() => window.tinymce.get('content').save());
    const after = await page.locator('#content').inputValue();
    assert.equal(after.split(shortcode).length - 1, 1, 'home_02 shortcode must occur exactly once');
    assert(after.includes('home_00') && after.includes('home_01'), 'existing homepage sections changed');
    assert(after.indexOf('home_02') > after.lastIndexOf('home_01'), 'home_02 not after home_01');

    await page.locator('#publish').click();
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
    const readback = await page.locator('#content').inputValue();
    assert.equal(readback.split(shortcode).length - 1, 1, 'saved native shortcode missing or duplicate');
    assert(readback.includes('home_00') && readback.includes('home_01'), 'existing sections lost after save');
    console.log('HOME02_PAGE_INSERT_CODE=PASS ' + JSON.stringify({
      pageId: 82454, shortcode, savedLength: readback.length
    }));
  } catch (error) {
    console.error('HOME02_PAGE_INSERT_CODE=FAIL ' + error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();