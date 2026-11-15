'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const task=JSON.parse(fs.readFileSync('cms-requests/aqua-sitemap-cms-2026-11-15.json','utf8'));
const wp='https://admin.aquathanhxuan.io.vn';
const frontend='https://aquathanhxuan.io.vn';
const rest=wp+'/wp-json/esc-seo-files/v1/public';
const expectedRobots='# Aqua Thanh Xuân - robots.txt\nUser-agent: *\nAllow: /\nSitemap: '+frontend+'/sitemap.xml\n';
const expectedLlms='# Aqua Thanh Xuân\n\n> Cửa hàng thủy sinh Aqua Thanh Xuân.\n\n## Website chính thức\n- [Trang chủ Aqua Thanh Xuân]('+frontend+'/)\n- [Sản phẩm thủy sinh]('+frontend+'/san-pham)\n';
const sleep=(n)=>new Promise(resolve=>setTimeout(resolve,n));
if (task.project!=='aquathanhxuan.com' || task.environment!=='production' || task.frontend_host!=='aquathanhxuan.io.vn' || task.wp_origin!==wp || task.target_mode!=='auto') throw Error('Unapproved WordPress site or sitemap mode');
if(!process.env.WP_ADMIN_USERNAME || !process.env.WP_ADMIN_PASSWORD)throw Error('Missing WP admin login secrets');
async function current(){
 for(let tryNo=1;tryNo<=3;tryNo++){
  try{
   const r=await fetch(rest+'?no_cache='+Date.now(),{signal:AbortSignal.timeout(23000),headers:{'cache-control':'no-cache'}});
   if(!r.ok)throw Error('REST HTTP '+r.status);
   const j=await r.json();
   if(j.site!==frontend || j.version!==1 || !j.sitemap || !['auto','manual'].includes(j.sitemap.mode))throw Error('Unexpected SEO Files site/contract');
   return j;
  }catch(e){if(tryNo===3)throw e;await sleep(1200)}
 }
}
const report={status:'STARTED',site:frontend,writeScope:'esc_seo_files_v1 sitemap_mode/robots + stale foreign llms only',checks:[]};
(async()=>{
 const baseline=await current();
 report.baseline={mode:baseline.sitemap.mode,extraCount:baseline.sitemap.extra.length,excludeCount:baseline.sitemap.exclude.length,robotsCorrect:baseline.robots===expectedRobots,foreignLlms:/ptscps|PTSC|thegioihosting/i.test(baseline.llms)};
 if (!Array.isArray(baseline.sitemap.extra)||!Array.isArray(baseline.sitemap.exclude))throw Error('Unexpected current sitemap overrides');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  for(let n=1;n<=3;n++){
   try{await page.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});break;}
   catch(e){if(n===3)throw e;await sleep(1200)}
  }
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await Promise.all([
     page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{waitUntil:'domcontentloaded',timeout:45000}),
     page.locator('#wp-submit').click(),
   ]);
  }
  if(!new URL(page.url()).pathname.startsWith('/wp-admin/'))throw Error('WordPress admin authentication not verified');
  async function openTab(tab){
   const nav=await page.goto(wp+'/wp-admin/options-general.php?page=esc-seo-files&tab='+tab,{waitUntil:'domcontentloaded',timeout:45000});
   if(!nav?.ok()||!await page.locator('input[name="action"][value="esc_seo_files_save"]').count())throw Error('SEO Files admin form missing: '+tab);
   return page.locator('form:has(input[name="action"][value="esc_seo_files_save"])');
  }
  async function submit(form,tab){
   await Promise.all([
    page.waitForURL(u=>u.pathname==='/wp-admin/options-general.php'&&u.searchParams.get('tab')===tab&&u.searchParams.get('updated')==='1',{waitUntil:'domcontentloaded',timeout:45000}),
    form.locator('input[type="submit"]').first().click(),
   ]);
   report.checks.push('WP_SAVE_'+tab.toUpperCase()+'_PASS');
  }
  if(baseline.sitemap.mode!=='auto'){
   const form=await openTab('sitemap');
   await form.locator('input[name="sitemap_mode"][value="auto"]').check();
   await form.locator('#esc-seo-extra').fill(baseline.sitemap.extra.join('\n'));
   await form.locator('#esc-seo-exclude').fill(baseline.sitemap.exclude.join('\n'));
   await submit(form,'sitemap');
  }
  let state=await current();
  if(state.sitemap.mode!=='auto'||JSON.stringify(state.sitemap.extra)!==JSON.stringify(baseline.sitemap.extra)||JSON.stringify(state.sitemap.exclude)!==JSON.stringify(baseline.sitemap.exclude))throw Error('WordPress sitemap read-after-write mismatch');
  report.checks.push('WORDPRESS_AUTO_MODE_VERIFIED');
  if(state.robots!==expectedRobots){
   const form=await openTab('robots');
   await form.locator('#esc-seo-robots').fill(expectedRobots);
   await submit(form,'robots');
   state=await current();
   if(state.robots!==expectedRobots)throw Error('robots.txt WordPress read-after-write mismatch');
  }
  report.checks.push('WORDPRESS_ROBOTS_CANONICAL_PASS');
  if(/ptscps|PTSC|thegioihosting/i.test(state.llms)){
   const form=await openTab('llms');
   await form.locator('#esc-seo-llms').fill(expectedLlms);
   await submit(form,'llms');
   state=await current();
   if(state.llms!==expectedLlms)throw Error('llms.txt read-after-write mismatch');
   report.checks.push('FOREIGN_PROJECT_LLMS_FIXED');
  }else{report.checks.push('LLMS_NO_FOREIGN_PROJECT_REFERENCE');}
  // New WordPress preview must enumerate real WordPress Pages/Products/Taxonomy.
  await openTab('sitemap');
  await page.locator('#esc-seo-count').waitFor({state:'visible',timeout:15000});
  await page.waitForFunction(()=>{
   const text=document.querySelector('#esc-seo-count')?.textContent||'';
   return /[1-9]\d{2,}\s*\/\s*[1-9]\d{2,}\s*URL/.test(text);
  },null,{timeout:45000});
  report.preview=String(await page.locator('#esc-seo-count').textContent()).trim();
  report.checks.push('WORDPRESS_AUTO_PREVIEW_FULL_URL_LIST_PASS');
  const final=await current();
  if(final.sitemap.mode!=='auto'||final.robots!==expectedRobots)throw Error('Final WordPress SEO Files contract differs');
  report.status='PASS';
  console.log('AQUA_WORDPRESS_SITEMAP_CONFIG='+JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{report.status='FAIL';report.error=String(e.message||e);console.error('AQUA_WORDPRESS_SITEMAP_CONFIG='+JSON.stringify(report));process.exitCode=1});
