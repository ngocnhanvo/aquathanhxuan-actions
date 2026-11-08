const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const site='https://aquathanhxuan.io.vn';
const wp='https://admin.aquathanhxuan.io.vn';
const expectedSha='432b60ad9f537e87ec23f0603b104df50f6695b4';
const widths=[[1440,900],[1024,768],[768,1024],[844,390],[390,844]];
const expectedHome=[
  'Nhập khẩu và phân phối chính hãng, được chọn lọc và kiểm tra kỹ trước khi giao tới tay khách hàng.',
  'Đơn hàng được xử lý và giao đi ngay khi có xác nhận.',
  'Khách hàng được hỗ trợ tư vấn miễn phí 24/7.',
  'Sản phẩm được bảo hành theo chính sách nhà sản xuất.'
];
const expectedFeatured=[
  'Đèn Chihiros','Lọc Thùng Atman','Phân nền dennerle',
  'Vi sinh biodigest Probidio','Phân nước Tropica'
];
const expectedSupport=['Chính sách đổi trả hàng','Giới thiệu','Đại Lý','Khiếu nại','Liên hệ'];
(async()=>{
 const markerResponse=await fetch(site+'/aquathanhxuan-staging-build.json?footerconsult='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
 assert.equal(markerResponse.status,200,'MISSING_DEPLOY_MARKER');
 const marker=await markerResponse.json();
 assert.equal(marker.commit,expectedSha,'PRODUCTION_SHA_MISMATCH');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 fs.mkdirSync('artifacts/footer-consultation-home05',{recursive:true});
 try{
  for(const [width,height] of widths){
   const page=await browser.newPage({viewport:{width,height}});
   await page.goto(site+'/?footerconsult='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
   const home=page.locator('[data-aqua-home-benefits]');
   await home.waitFor({state:'attached',timeout:20000});
   const descriptions=await home.locator('article p').allTextContents();
   assert.deepEqual(descriptions.map(s=>s.trim()),expectedHome,'HOME05_PARITY');
   assert.equal(await home.locator('article').count(),4,'HOME05_CARD_COUNT');
   const footer=page.locator('#footer-contact');
   await footer.scrollIntoViewIfNeeded();
   const featured=await footer.locator('[aria-labelledby="footer-featured-title"] li').allTextContents();
   const support=await footer.locator('[aria-labelledby="footer-policy-title"] li').allTextContents();
   assert.deepEqual(featured.map(s=>s.trim()),expectedFeatured,'FEATURED_FOOTER_PARITY');
   assert.deepEqual(support.map(s=>s.trim()),expectedSupport,'SUPPORT_FOOTER_PARITY');
   assert((await footer.innerText()).includes('Lương Ngọc Quyến'),'Footer address');
   assert((await footer.innerText()).includes('0972551688'),'Footer hotline');
   assert((await footer.innerText()).includes('aquathanhxuan3018@gmail.com'),'Footer email');
   assert.equal(await footer.locator('section[aria-labelledby="footer-featured-title"] a[href]').count(),5,'Featured product links');
   assert.equal(await footer.locator('img[src]').count()>0,true,'Footer official logo');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
   assert(!overflow,'HORIZONTAL_OVERFLOW_'+width);
   const widget=page.locator('#contact-widget');
   const launcher=page.locator('#ai-agent-btn');
   assert.equal(await launcher.count(),1,'ONLY_ONE_CONSULTATION_LAUNCHER');
   await launcher.click();
   const menu=page.locator('#consultation-menu');
   assert.equal(await launcher.getAttribute('aria-expanded'),'true','PANEL_OPEN');
   await menu.locator('a[href^="tel:"]').first().waitFor({state:'visible'});
   await menu.locator('a[href*="m.me/"]').first().waitFor({state:'visible'});
   await menu.locator('a[href*="zalo.me/"]').first().waitFor({state:'visible'});
   assert.equal(await menu.locator('a[href*="zalo.me/"]').first().getAttribute('href'),'https://zalo.me/0972551688','ZALO_CANONICAL_TARGET');
   const label=await menu.locator('a[href*="zalo.me/"]').innerText();
   assert(label.includes('0972551688')||label.includes('1900.666.888'),'ZALO_LABEL');
   await menu.locator('#close-consultation').click();
   assert.equal(await menu.getAttribute('aria-hidden'),'true','PANEL_CLOSE');
   await launcher.click();
   await menu.locator('#open-agent-from-consultation').click();
   await page.locator('#ai-chat-box').waitFor({state:'visible'});
   await page.locator('#close-chat-btn').click();
   await launcher.waitFor({state:'visible'});
   await footer.screenshot({path:'artifacts/footer-consultation-home05/footer-'+width+'.png'});
   await widget.screenshot({path:'artifacts/footer-consultation-home05/widget-'+width+'.png'});
   console.log('FOOTER_CONSULTATION_HOME05_VIEWPORT_PASS='+width+'x'+height);
   await page.close();
  }
  if(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD){
   const admin=await browser.newPage({viewport:{width:1440,height:900}});
   await admin.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
   if(await admin.locator('#user_login').count()){
     await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
     await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
     await admin.locator('#wp-submit').click();
   }
   await admin.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
   await admin.goto(wp+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=82454',{waitUntil:'domcontentloaded',timeout:60000});
   const footer=admin.frameLocator('#esc-vb-frame').locator('#footer-contact');
   await footer.waitFor({state:'visible',timeout:50000});
   const tables=await footer.locator('[data-esc-source-table]').evaluateAll(nodes=>nodes.map(n=>n.dataset.escSourceTable));
   assert(tables.includes('pub_aquafooterlinks'),'BUILDER_FOOTER_GLOBAL_TABLE_MISSING');
   const links=footer.locator('[data-esc-source-table="pub_aquafooterlinks"] [data-esc-source-row]');
   assert.equal(await links.count(),10,'BUILDER_FOOTER_GLOBAL_ROWS');
   const home=admin.frameLocator('#esc-vb-frame').locator('[data-aqua-home-benefits]');
   assert.equal(await home.locator('article p[data-esc-builder-cell-field="description"]').count(),4,'BUILDER_HOME05_DESC_FIELDS');
   await admin.screenshot({path:'artifacts/footer-consultation-home05/builder.png'});
   console.log('FOOTER_CONSULTATION_HOME05_BUILDER_PASS');
   await admin.close();
  }
  console.log('FOOTER_CONSULTATION_HOME05_QA=PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error('FOOTER_CONSULTATION_HOME05_QA=FAIL '+(e.stack||e.message));process.exitCode=1;});
