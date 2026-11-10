import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const wpUrl = process.env.WP_URL;
const frontendUrl = process.env.FRONTEND_URL;
const username = process.env.WP_ADMIN_USERNAME;
const password = process.env.WP_ADMIN_PASSWORD;
const expectedSha = process.env.EXPECTED_SOURCE_SHA;

for (const [key, value] of Object.entries({ wpUrl, frontendUrl, username, password, expectedSha })) {
  if (!value) throw new Error(`Missing required environment value: ${key}`);
}
if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error('Invalid EXPECTED_SOURCE_SHA');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const deadlineAfter = (ms) => Date.now() + ms;

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const loginUrl = new URL('/wp-login.php', wpUrl).toString();
  // WordPress may intermittently stall on wp-login.php while ACF/Woo
  // background requests run. Retry only navigation; do not bypass auth or
  // trigger another build. Keep a hard finite retry bound.
  let loginNavigationSucceeded = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 35_000 });
      loginNavigationSucceeded = true;
      console.log('WORDPRESS_LOGIN_NAVIGATION=PASS attempt=' + attempt);
      break;
    } catch (error) {
      console.log('WORDPRESS_LOGIN_NAVIGATION_RETRY attempt=' + attempt +
        ' error=' + safeText(error?.message).slice(0, 130));
      if (attempt < 3) await sleep(3_000);
    }
  }
  if (!loginNavigationSucceeded) {
    throw new Error('WORDPRESS_LOGIN_NAVIGATION_FAILED_AFTER_3_ATTEMPTS');
  }

  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill(username);
    await page.locator('#user_pass').fill(password);
    await Promise.all([
      // ACF/admin assets can keep network/load open well after authenticated navigation.
      // The URL and the subsequent protected admin request still verify login.
      page.waitForURL((url) => url.pathname.startsWith('/wp-admin/'), { waitUntil: 'domcontentloaded', timeout: 45_000 }),
      page.locator('#wp-submit').click(),
    ]);
  }

  if (!page.url().startsWith(new URL('/wp-admin/', wpUrl).toString())) {
    const error = safeText(await page.locator('#login_error').textContent().catch(() => ''));
    throw new Error(`WORDPRESS_LOGIN_FAILED${error ? `: ${error}` : ''}`);
  }
  console.log('WORDPRESS_LOGIN=PASS');

  const buildUrl = new URL('/wp-admin/admin.php?page=vcs-build-trigger', wpUrl).toString();
  await page.goto(buildUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('#vcs-build-btn-main').waitFor({ state: 'visible', timeout: 20_000 });

  const config = await page.evaluate(() => ({
    configured: Boolean(window.vcsBuild?.build_configured),
    active: Boolean(window.vcsBuild?.initial_active),
    pending: Number(window.vcsBuild?.pending_count || 0),
  }));
  if (!config.configured) throw new Error('WORDPRESS_BUILD_NOT_CONFIGURED');
  if (config.active) throw new Error('WORDPRESS_BUILD_ALREADY_ACTIVE; refusing duplicate trigger');
  console.log(`WORDPRESS_BUILD_PREFLIGHT=PASS pending_count=${config.pending}`);

  const force = page.locator('#vcs-force-build');
  await force.check();
  const button = page.locator('#vcs-build-btn-main');
  const enableDeadline = deadlineAfter(10_000);
  while (await button.isDisabled()) {
    if (Date.now() >= enableDeadline) throw new Error('WORDPRESS_BUILD_BUTTON_REMAINED_DISABLED_AFTER_FORCE');
    await sleep(250);
  }

  await button.click();
  console.log('BUILD_TRIGGERED_VIA_WORDPRESS=PASS force_build=1');

  const buildDeadline = deadlineAfter(28 * 60_000);
  let lastHeartbeat = 0;
  let lastStatus = '';
  while (Date.now() < buildDeadline) {
    const icon = safeText(await page.locator('#vcs-status-icon').textContent().catch(() => ''));
    const statusText = safeText(await page.locator('#vcs-status-text').textContent().catch(() => ''));
    const status = `${icon} ${statusText}`.trim();

    if (status !== lastStatus) {
      console.log(`WORDPRESS_BUILD_STATUS=${status.slice(0, 500)}`);
      lastStatus = status;
    }
    if (icon.includes('✅')) {
      console.log('BUILD_SUCCESS=PASS');
      break;
    }
    if (icon.includes('❌')) throw new Error(`BUILD_FAILED: ${statusText.slice(0, 500)}`);

    if (Date.now() - lastHeartbeat >= 30_000) {
      console.log(`BUILD_WAIT elapsed_seconds=${Math.floor((28 * 60_000 - (buildDeadline - Date.now())) / 1000)}`);
      lastHeartbeat = Date.now();
    }
    await sleep(5_000);
  }
  if (Date.now() >= buildDeadline) throw new Error('BUILD_TIMEOUT after 28 minutes');

  const markerUrl = new URL('/aquathanhxuan-staging-build.json', frontendUrl).toString();
  const readinessDeadline = deadlineAfter(120_000);
  let marker = null;
  let readinessAttempt = 0;
  while (Date.now() < readinessDeadline) {
    readinessAttempt += 1;
    try {
      const response = await fetch(`${markerUrl}?qa=${Date.now()}`, {
        headers: { 'cache-control': 'no-cache' },
        redirect: 'error',
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.commit === expectedSha && data?.branch === 'master' && data?.target === 'aquathanhxuan.io.vn') {
          marker = data;
          break;
        }
        console.log(`DEPLOY_READY_PENDING attempt=${readinessAttempt} expected=${expectedSha} actual=${data?.commit || 'missing'}`);
      } else {
        console.log(`DEPLOY_READY_PENDING attempt=${readinessAttempt} http_status=${response.status}`);
      }
    } catch (error) {
      console.log(`DEPLOY_READY_PENDING attempt=${readinessAttempt} error=${safeText(error?.message).slice(0, 180)}`);
    }
    await sleep(10_000);
  }
  if (!marker) throw new Error(`DEPLOY_TIMEOUT marker did not reach source ${expectedSha}`);
  console.log(`DEPLOY_READY=PASS commit=${marker.commit}`);

  await page.goto(`${frontendUrl}/?qa=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('#main-header').waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('#header-product-search').waitFor({ state: 'visible', timeout: 20_000 });

  const accountVisible = await page.getByText('Tài khoản', { exact: true }).first().isVisible().catch(() => false);
  const cartVisible = await page.getByText('Giỏ hàng', { exact: true }).first().isVisible().catch(() => false);
  const contactsVisible = await page.locator('#header-contacts').isVisible().catch(() => false);
  const navVisible = await page.locator('#header-navrow').isVisible().catch(() => false);
  const logoVisible = await page.locator('#header-brandbar a[aria-label="Về trang chủ"] img').isVisible().catch(() => false);

  const navBackground = await page.locator('#header-navrow').evaluate((el) => getComputedStyle(el).backgroundColor);
  const required = { accountVisible, cartVisible, navVisible, logoVisible };
  for (const [check, value] of Object.entries(required)) {
    if (!value) throw new Error(`QA_FAILED check=${check} expected=true actual=false`);
  }
  if (contactsVisible) throw new Error('QA_FAILED check=headerContactsHidden expected=false actual=true');
  if (navBackground !== 'rgb(51, 43, 142)') {
    throw new Error(`QA_FAILED check=navBackground expected=rgb(51, 43, 142) actual=${navBackground}`);
  }

  // The white header search must be centered relative to the entire header,
  // not to the remaining flex space between differently sized side controls.
  const verifySearchPosition = async (width) => {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.evaluate(() => {
      const bounds = (selector) => document.querySelector(selector)?.getBoundingClientRect();
      const brand = bounds('#header-brandbar > div');
      const search = bounds('#header-desktop-search');
      const logo = bounds('#header-brandbar a[aria-label="Về trang chủ"]');
      const account = [...document.querySelectorAll('#header-brandbar a')].find((a) => a.textContent?.trim() === 'Tài khoản')?.getBoundingClientRect();
      const cart = [...document.querySelectorAll('#header-brandbar a')].find((a) => a.textContent?.trim() === 'Giỏ hàng')?.getBoundingClientRect();
      const menu = document.querySelector('#header-navrow');
      if (!brand || !search || !logo || !account || !cart || !menu) return { missingElement: true };
      return {
        centerDeltaPx: Math.abs((search.left + search.right) / 2 - (brand.left + brand.right) / 2),
        logoClearancePx: search.left - logo.right,
        accountClearancePx: account.left - search.right,
        searchWidth: search.width,
        menuBackground: getComputedStyle(menu).backgroundColor,
      };
    });
    if (metrics.missingElement || metrics.centerDeltaPx > 2 || metrics.logoClearancePx < 8 || metrics.accountClearancePx < 8 || metrics.searchWidth < 180 || metrics.menuBackground !== 'rgb(51, 43, 142)') {
      throw new Error('QA_FAILED check=headerSearchTrueCenter viewport=' + width + ' measurements=' + JSON.stringify(metrics));
    }
    console.log('HEADER_SEARCH_CENTER_PASS=' + JSON.stringify({ width, ...metrics }));
  };
  for (const width of [900, 1024, 1440, 1920]) await verifySearchPosition(width);
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.locator('#header-desktop-search').isVisible()) {
    throw new Error('QA_FAILED check=mobileSearchVisibility expected=false actual=true');
  }
  const mobileOverflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth);
  if (mobileOverflow > 2) throw new Error('QA_FAILED check=mobileHeaderOverflow actual=' + mobileOverflow);
  console.log('HEADER_SEARCH_MOBILE_UNCHANGED_PASS=390');
  if (await page.locator('#header-brandbar .header-logo-bubbles').isVisible()) {
    throw new Error('QA_FAILED check=mobileLogoBubblesHidden expected=false');
  }
  console.log('HEADER_BUBBLES_MOBILE_HIDDEN_PASS=390');
  await page.setViewportSize({ width: 1440, height: 900 });

  const bubbles = await page.evaluate(() => {
    const logo = document.querySelector('#header-brandbar a[aria-label="Về trang chủ"]');
    const wrapper = logo?.querySelector('.header-logo-bubbles');
    const items = [...(wrapper?.querySelectorAll('.header-logo-bubble') || [])];
    const style = wrapper ? getComputedStyle(wrapper) : null;
    return {
      count: items.length,
      ariaHidden: wrapper?.getAttribute('aria-hidden'),
      pointerEvents: style?.pointerEvents,
      firstAnimation: items.length ? getComputedStyle(items[0]).animationName : null,
      firstDuration: items.length ? getComputedStyle(items[0]).animationDuration : null,
      wrapperInsideLogo: !!wrapper && logo?.contains(wrapper),
      headerHorizontalOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth,
    };
  });
  if (bubbles.count !== 5 || bubbles.ariaHidden !== 'true' || bubbles.pointerEvents !== 'none'
      || bubbles.firstAnimation !== 'header-bubble-rise' || !bubbles.wrapperInsideLogo
      || bubbles.headerHorizontalOverflow > 2) {
    throw new Error('QA_FAILED check=logoBubbleAnimation expected=5 valid decorative bubbles actual=' + JSON.stringify(bubbles));
  }
  console.log('HEADER_LOGO_BUBBLES_DESKTOP_PASS=' + JSON.stringify(bubbles));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (await page.locator('#header-brandbar .header-logo-bubbles').isVisible()) {
    throw new Error('QA_FAILED check=reducedMotionBubblesHidden expected=false');
  }
  console.log('HEADER_LOGO_BUBBLES_REDUCED_MOTION_PASS=hidden');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/aquathanhxuan-header-production.png', fullPage: false });
  console.log('QA_PASS header_search=centered account=visible cart=visible contacts=hidden nav=purple logo=visible');
} finally {
  await browser?.close().catch(() => {});
}
