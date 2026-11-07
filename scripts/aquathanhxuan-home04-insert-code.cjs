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
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(45000);
  page.on('dialog', async dialog => {
    if (dialog.type() === 'beforeunload') await dialog.accept();
    else await dialog.dismiss();
  });
  const shortcode = '[table id=home_04 /]';
  try {
    let loginError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await page.goto(env.WC_URL + '/wp-login.php', { waitUntil: 'domcontentloaded', timeout: 45000 });
        loginError = null;
        break;
      } catch (error) {
        loginError = error;
        if (!/Timeout|net::ERR_|ECONNRESET/i.test(error.message) || attempt === 2) throw error;
        console.log('HOME04_WP_LOGIN_NAV_RETRY=' + attempt);
        await page.waitForTimeout(1500);
      }
    }
    if (loginError) throw loginError;
    if (await page.locator('#user_login').count()) {
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(url => url.pathname.startsWith('/wp-admin/'));
    const editUrl = env.WC_URL + '/wp-admin/post.php?post=82454&action=edit&esc_full_admin=1';
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('#content').waitFor({ state: 'attached', timeout: 25000 });
    const before = await page.locator('#content').inputValue();
    console.log('HOME04_PRECHECK=' + JSON.stringify({
      length: before.length, has00: before.includes('home_00'),
      has01: before.includes('home_01'), has02: before.includes('home_02'), has03: before.includes('home_03'), has04: before.includes('home_04')
    }));
    assert(before.includes('home_00') && before.includes('home_01') && before.includes('home_02') && before.includes('home_03'), 'existing sections missing');
    if (before.includes(shortcode)) {
      assert.equal(before.split(shortcode).length - 1, 1, 'pre-existing duplicate home_04');
      console.log('HOME04_INSERT_CODE=PASS_ALREADY_PRESENT');
      return;
    }

    // The live editor exposes the native ESC Table Quicktags button, but not
    // the TinyMCE toolbar variant. Invoke the installed Quicktags button in
    // Text mode, allowing the theme's asynchronous preview image to finish.
    await page.locator('#content-html').click();
    await page.locator('#content').waitFor({ state: 'visible', timeout: 15000 });
    const toolbar = page.locator('#qt_content_tablepress_quicktags_button');
    await toolbar.waitFor({ state: 'visible', timeout: 10000 });
    await page.evaluate(() => {
      const textarea = document.getElementById('content');
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      window.wpActiveEditor = 'content';
    });
    await toolbar.click();
    const frame = page.frameLocator('#TB_iframeContent');
    const picker = frame.locator('input.insert-shortcode[title="[table id=home_04 /]"]');
    await picker.waitFor({ state: 'visible', timeout: 15000 });
    assert.equal(await picker.getAttribute('title'), shortcode);
    await picker.click();

    // Theme html.php overrides send_to_editor and loads a preview image
    // before calling WordPress's native insertion. 650ms was insufficient.
    // Never save without seeing the inserted shortcode.
    let nativeWaitError = null;
    try {
      await page.waitForFunction(
        needle => document.getElementById('content').value.includes(needle)
          || (window.tinymce?.get('content')?.getContent?.() || '').includes(needle),
        shortcode, { timeout: 25000 }
      );
    } catch (error) { nativeWaitError = error.message; }
    const editorState = await page.evaluate(() => ({
      active: window.wpActiveEditor, hidden: window.tinymce?.get('content')?.isHidden?.(),
      rich: window.tinymce?.get('content')?.getContent?.() || '',
      textarea: document.getElementById('content').value,
      thickbox: !!document.getElementById('TB_window')
    }));
    console.log('HOME04_NATIVE_INSERT=' + JSON.stringify({
      active: editorState.active, hidden: editorState.hidden,
      richHas02: editorState.rich.includes(shortcode),
      textHas02: editorState.textarea.includes(shortcode),
      textLength: editorState.textarea.length,
      thickbox: editorState.thickbox, timeout: nativeWaitError
    }));
    assert(editorState.rich.includes(shortcode) || editorState.textarea.includes(shortcode),
      'Native Insert Code did not update active editor; page intentionally NOT SAVED');
    // Text mode already stores content in the textarea: calling TinyMCE.save()
    // while hidden would overwrite it with the stale Visual editor snapshot.
    const after = await page.locator('#content').inputValue();
    assert(after.includes(before.trim()), 'Existing WordPress content altered during insertion');
    assert.equal(after.split(shortcode).length - 1, 1, 'home_04 shortcode must occur exactly once');
    assert(after.includes('home_00') && after.includes('home_01') && after.includes('home_02') && after.includes('home_03'), 'existing homepage sections changed');
    assert(after.indexOf('home_04') > after.lastIndexOf('home_03'), 'home_04 not after home_03');

    // Publish submits a full WordPress form. The old script navigated away
    // immediately after click, aborting the in-flight save/redirect.
    const saving = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 })
      .then(() => 'redirected')
      .catch(error => 'navigation_unconfirmed: ' + error.message.split('\\n')[0]);
    await page.locator('#publish').click({ noWaitAfter: true });
    console.log('HOME04_SAVE_NAVIGATION=' + await saving);

    // Read back in a separate tab sharing the authenticated browser context.
    // Never click Publish again on a retry: only retry the read-only verification.
    const verify = await page.context().newPage();
    verify.setDefaultNavigationTimeout(45000);
    let readback = '';
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await verify.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await verify.locator('#content').waitFor({ state: 'attached', timeout: 16000 });
          readback = await verify.locator('#content').inputValue();
          if (readback.includes(shortcode)) break;
          console.log('HOME04_READBACK_RETRY=' + attempt + ' shortcode_missing');
        } catch (error) {
          if (attempt === 3 || !/Timeout|net::ERR_|ECONNRESET/i.test(error.message)) throw error;
          console.log('HOME04_READBACK_RETRY=' + attempt + ' transient_navigation');
        }
        await page.waitForTimeout(1400);
      }
    } finally {
      await verify.close();
    }
    assert.equal(readback.split(shortcode).length - 1, 1, 'saved native shortcode missing or duplicate');
    assert(readback.includes('home_00') && readback.includes('home_01') && readback.includes('home_02') && readback.includes('home_03'), 'existing sections lost after save');
    console.log('HOME04_PAGE_INSERT_CODE=PASS ' + JSON.stringify({
      pageId: 82454, shortcode, savedLength: readback.length
    }));
  } catch (error) {
    console.error('HOME04_PAGE_INSERT_CODE=FAIL ' + error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();