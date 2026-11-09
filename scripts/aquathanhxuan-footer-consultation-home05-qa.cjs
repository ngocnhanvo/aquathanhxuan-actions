const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const site='https://aquathanhxuan.io.vn';
const wp='https://admin.aquathanhxuan.io.vn';
const expectedSha='282aac0a62bf4dd2d860faaa927e5a55bab8aed5';
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
const expectedSubmenuCounts=[21,8,9,6,9,5,7,5,8,5,3];
(async()=>{
 const markerResponse=await fetch(site+'/aquathanhxuan-staging-build.json?footerconsult='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
 assert.equal(markerResponse.status,200,'MISSING_DEPLOY_MARKER');
 const marker=await markerResponse.json();
 assert.equal(marker.commit,expectedSha,'PRODUCTION_SHA_MISMATCH');
 const menuResponse=await fetch(wp+'/wp-json/esc-api/v1/menus?menuqa='+Date.now(),{signal:AbortSignal.timeout(20000)});
 assert.equal(menuResponse.status,200,'WORDPRESS_HEADER_REST_UNAVAILABLE');
 const menuSource=(await menuResponse.json())?.menus?.Header?.vi?.items;
 assert(Array.isArray(menuSource)&&menuSource.length===11,'WORDPRESS_HEADER_ROOT_MISMATCH');
 for(let i=0;i<11;i++){
   const root=menuSource[i],children=root?.children||[];
   assert.equal(children.length,expectedSubmenuCounts[i],
     'WORDPRESS_MENU_CHILD_COUNT_'+i);
   assert.equal(children[0]?.label,'Tất cả','WORDPRESS_ALL_ITEM_MUST_BE_FIRST_'+i);
   const pathOf=value=>{
     const link=String(value||'');
     const parsed=/^https?:\/\//i.test(link)?new URL(link).pathname:link;
     return parsed.replace(/\/+$/,'');
   };
   assert.equal(pathOf(children[0]?.href||children[0]?.slug),
     pathOf(root?.href||root?.slug),'WORDPRESS_ALL_TARGET_MISMATCH_'+i);
 }
 console.log('HEADER_WORDPRESS_MENU_CHILDREN_PASS='+menuSource.map(i=>(i.children||[]).length).join(','));

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
   if(width===1440){
     const roots=page.locator('#desktop-menu > ul > li');
     assert.equal(await roots.count(),11,'DESKTOP_HEADER_ROOT_COUNT');
     const first=roots.first();
     for(let i=0;i<11;i++){
       const parent=roots.nth(i);
       assert.equal(await parent.locator(':scope > a[href]').count(),0,'DESKTOP_PARENT_LINK_NOT_REMOVED_'+i);
       assert.equal(await parent.locator(':scope > button[data-menu-trigger]').count(),1,
         'DESKTOP_PARENT_TOGGLE_MISSING_'+i);
     }
     const toggle=first.locator(':scope > button[data-menu-trigger]');
     const initialUrl=page.url();
     await toggle.locator('span').first().click();
     assert.equal(page.url(),initialUrl,'DESKTOP_PARENT_NAVIGATED');
     assert.equal(await toggle.getAttribute('aria-expanded'),'true','DESKTOP_SUBMENU_NOT_OPEN');
     const firstAll=first.locator('[data-menu-panel] a[href]').first();
     assert.equal((await firstAll.innerText()).trim(),'Tất cả','DESKTOP_ALL_LABEL');
     assert.match(await firstAll.getAttribute('href'),/\/san-pham\/thuong-hieu\/?$/,'DESKTOP_ALL_PARENT_URL');
     assert((await first.locator('[data-menu-panel] a[href]').count())>=21,'DESKTOP_SUBMENU_LINKS_MISSING');
     await page.screenshot({path:'artifacts/footer-consultation-home05/header-desktop-submenu.png'});
     await toggle.click();
     assert.equal(await toggle.getAttribute('aria-expanded'),'false','DESKTOP_SUBMENU_NOT_CLOSED');
     console.log('HEADER_DESKTOP_SUBMENU_PASS');
   }
   if(width===390){
     await page.locator('#hamburger-btn').click();
     const roots=page.locator('#mobile-menu-container nav > ul > li');
     assert.equal(await roots.count(),11,'MOBILE_HEADER_ROOT_COUNT');
     const first=roots.first();
     for(let i=0;i<11;i++){
       const parent=roots.nth(i);
       assert.equal(await parent.locator(':scope > div > a[href]').count(),0,'MOBILE_PARENT_LINK_NOT_REMOVED_'+i);
       assert.equal(await parent.locator(':scope > div > button[data-menu-toggle]').count(),1,
         'MOBILE_PARENT_TOGGLE_MISSING_'+i);
     }
     const toggle=first.locator(':scope > div > button[data-menu-toggle]');
     const initialUrl=page.url();
     await toggle.locator('span').first().click();
     assert.equal(page.url(),initialUrl,'MOBILE_PARENT_NAVIGATED');
     assert.equal(await toggle.getAttribute('aria-expanded'),'true','MOBILE_SUBMENU_NOT_OPEN');
     const firstAll=first.locator('div[id^="mobile-branch-"] a[href]').first();
     assert.equal((await firstAll.innerText()).trim(),'Tất cả','MOBILE_ALL_LABEL');
     assert.match(await firstAll.getAttribute('href'),/\/san-pham\/thuong-hieu\/?$/,'MOBILE_ALL_PARENT_URL');
     assert((await first.locator('div[id^="mobile-branch-"] a[href]').count())>=21,'MOBILE_SUBMENU_LINKS_MISSING');
     await page.screenshot({path:'artifacts/footer-consultation-home05/header-mobile-submenu.png'});
     await toggle.click();
     assert.equal(await toggle.getAttribute('aria-expanded'),'false','MOBILE_SUBMENU_NOT_CLOSED');
     await page.locator('[data-mobile-menu-close]').click();
     console.log('HEADER_MOBILE_SUBMENU_PASS');
   }
   const footer=page.locator('#footer-contact');
   await footer.scrollIntoViewIfNeeded();
   const waveLayout=await footer.evaluate(root=>{
     const brand=root.querySelector('[data-aqua-footer-brand]');
     const wave=brand?.querySelector('[data-aqua-footer-wave]');
     const copyright=root.querySelector('[data-aqua-footer-copyright]');
     const tagline=brand?.querySelector('p');
     const logo=brand?.querySelector('a');
     if(!brand||!wave||!copyright||!tagline||!logo)return null;
     const br=brand.getBoundingClientRect();
     const wr=wave.getBoundingClientRect();
     const cr=copyright.getBoundingClientRect();
     const tr=tagline.getBoundingClientRect();
     const lr=logo.getBoundingClientRect();
     return {
       pathFills:[...wave.querySelectorAll('path')].map(el=>el.getAttribute('fill')),
       ariaHidden:wave.getAttribute('aria-hidden'),
       pointerEvents:getComputedStyle(wave).pointerEvents,
       copyrightAlign:getComputedStyle(copyright).textAlign,
       waveWidth:wr.width, brandWidth:br.width, waveHeight:wr.height,
       waveBottomGap:Math.abs(wr.bottom-cr.top),
       taglineGap:wr.top-tr.bottom,
       taglineCenter:tr.left+tr.width/2,
       logoCenter:lr.left+lr.width/2,
       brandCenter:br.left+br.width/2
     };
   });
   assert(waveLayout,'FOOTER_WAVE_STRUCTURE_MISSING_'+width);
   assert.deepEqual(waveLayout.pathFills,['#ffffff','#06bfee','#332B8E'],'FOOTER_WAVE_LAYERS_'+width);
   assert.equal(waveLayout.ariaHidden,'true','FOOTER_WAVE_DECORATIVE_'+width);
   assert.equal(waveLayout.pointerEvents,'none','FOOTER_WAVE_POINTER_EVENTS_'+width);
   assert.equal(waveLayout.copyrightAlign,'center','FOOTER_COPYRIGHT_ALIGNMENT_'+width);
   assert(waveLayout.waveHeight>=35&&waveLayout.waveHeight<=55,'FOOTER_WAVE_HEIGHT_'+width);
   assert(Math.abs(waveLayout.waveWidth-waveLayout.brandWidth)<=2,'FOOTER_WAVE_FULL_WIDTH_'+width);
   assert(waveLayout.waveBottomGap<=2,'FOOTER_WAVE_SEAM_'+width);
   assert(waveLayout.taglineGap>=4,'FOOTER_WAVE_OVERLAPS_TAGLINE_'+width+' '+JSON.stringify(waveLayout));
   assert(Math.abs(waveLayout.taglineCenter-waveLayout.brandCenter)<=2 &&
     Math.abs(waveLayout.logoCenter-waveLayout.brandCenter)<=2,
     'FOOTER_BRANDING_CENTER_CHANGED_'+width+' '+JSON.stringify(waveLayout));
   console.log('FOOTER_WAVE_VIEWPORT_PASS='+width+'x'+height);
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
   await page.waitForFunction(()=>document.querySelector('#back-to-top-btn')?.getAttribute('aria-hidden')==='false',null,{timeout:12000});
   const floating=await page.evaluate(()=>{
     const arrow=document.querySelector('#back-to-top-btn');
     const launcher=document.querySelector('#ai-agent-btn');
     const widget=document.querySelector('#contact-widget');
     const a=arrow.getBoundingClientRect(),l=launcher.getBoundingClientRect();
     return {gap:l.top-a.bottom,widgetZ:Number(getComputedStyle(widget).zIndex),
       arrowZ:Number(getComputedStyle(arrow).zIndex)};
   });
   assert(floating.gap>=8,'FLOATING_BUTTONS_OVERLAP_'+width+' '+JSON.stringify(floating));
   assert(floating.widgetZ>floating.arrowZ,'CONSULTATION_PANEL_NOT_ABOVE_ARROW_'+width);

   await launcher.click();
   const menu=page.locator('#consultation-menu');
   assert.equal(await launcher.getAttribute('aria-expanded'),'true','PANEL_OPEN');
   await page.waitForTimeout(260);
   const panelStack=await page.evaluate(()=>{
     const menu=document.querySelector('#consultation-menu');
     const arrow=document.querySelector('#back-to-top-btn');
     const r=arrow.getBoundingClientRect(),p=menu.getBoundingClientRect();
     const cx=r.x+r.width/2,cy=r.y+r.height/2;
     return {overlaps:p.left<=cx&&cx<=p.right&&p.top<=cy&&cy<=p.bottom,
       hit:menu.contains(document.elementFromPoint(cx,cy))};
   });
   assert(panelStack.overlaps&&panelStack.hit,'CONSULTATION_PANEL_DOES_NOT_COVER_ARROW_'+width+' '+JSON.stringify(panelStack));
   assert.equal(await menu.locator('a[href^="tel:"] svg').count(),1,'PHONE_SVG_MISSING');
   assert.equal(await menu.locator('a[href*="m.me/"] svg').count(),1,'MESSENGER_SVG_MISSING');
   assert.equal(await menu.locator('a[href*="zalo.me/"] svg').count(),1,'ZALO_SVG_MISSING');
   const menuText=await menu.innerText();
   assert(!menuText.includes('☎️')&&!menuText.includes('💬'),'EMOJI_ICON_NOT_REPLACED');
   console.log('CONSULTATION_OVERLAY_ICONS_PASS='+width+'x'+height);

   await menu.locator('a[href^="tel:"]').first().waitFor({state:'visible'});
   console.log('CONSULTATION_CHANNEL_DIAGNOSTIC='+JSON.stringify(await menu.locator('a').evaluateAll(nodes=>nodes.map(x=>({href:x.getAttribute('href'),label:x.textContent.trim()})))));
   if (width === 1440) {
     const fetchDetails = async (url, transformer) => {
       try {
         const res = await page.request.get(url,{timeout:12000});
         const body = res.ok() ? await res.json() : null;
         return {status:res.status(),...transformer(body)};
       } catch(e) {return {error:e.message};}
     };
     const cached=await fetchDetails(site+'/data/cms-common.json?diagnostic='+Date.now(),body=>({
       info:body?.data_info?{facebook:body.data_info.facebook,zalo:body.data_info.zalo,hotline:body.data_info.hotline}:null,
       keys:body?Object.keys(body).slice(0,15):[]
     }));
     const source=await fetchDetails(wp+'/wp-json/wp/v2/thong-tin-chung?per_page=20&status=publish',body=>({
       records:Array.isArray(body)?body.map(x=>({id:x.id,facebook:x.acf?.facebook,zalo:x.acf?.zalo})):null
     }));
     const logs=await fetchDetails(wp+'/wp-json/astro/v1/get-thongtinchung-logs',body=>({
       records:Array.isArray(body)?body.map(x=>({id:x.id,action:x.action,type:x.type,facebook:x.info?.acf?.facebook,zalo:x.info?.acf?.zalo})):null
     }));
     console.log('CONTACT_SOURCE_DIAGNOSTIC='+JSON.stringify({cached,source,logs}));
   }
   assert(await menu.locator('a[href*="m.me/"]').count()>0,'MESSENGER_MISSING_IN_DEPLOYED_INFO');
   await menu.locator('a[href*="m.me/"]').first().waitFor({state:'visible'});
   await menu.locator('a[href*="zalo.me/"]').first().waitFor({state:'visible'});
   assert.equal(await menu.locator('a[href*="zalo.me/"]').first().getAttribute('href'),'https://zalo.me/0972551688','ZALO_CANONICAL_TARGET');
   const label=await menu.locator('a[href*="zalo.me/"]').innerText();
   assert(label.includes('0972551688')||label.includes('1900.666.888'),'ZALO_LABEL');
   const closeRect=await menu.locator('#close-consultation').boundingBox();
   assert(closeRect && closeRect.x>=-1 && closeRect.x+closeRect.width<=width+1 &&
     closeRect.y>=-1 && closeRect.y+closeRect.height<=height+1,
     'CLOSE_CONSULTATION_OUTSIDE_VIEWPORT_'+width+'x'+height+' '+JSON.stringify(closeRect));
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
   // Read-only UI regression: a mapped cell must open the native ESC Table
   // editor. Do not press Save: production content must remain unchanged.
   const desc=home.locator('article p[data-esc-builder-cell-field="description"]').first();
   await desc.click();
   await admin.waitForFunction(()=>
     (document.querySelector('#esc-vb-edit-caption')?.textContent||'').includes('home_05') &&
     Boolean(document.querySelector('#esc-vb-edit-row option[value="0:description"]')),
     null,{timeout:20000});
   assert.equal(await admin.locator('#esc-vb-edit-title').isDisabled(),false,
     'BUILDER_HOME05_DESC_EDIT_DISABLED');
   console.log('FOOTER_CONSULTATION_HOME05_DESCRIPTION_EDITOR_PASS');
   const footerGroup=footer.locator('[data-esc-source-table="pub_aquafooterlinks"]').first();
   const footerVersion=await footerGroup.getAttribute('data-esc-rendered-version');
   const footerLabels=footer.locator('[data-esc-source-table="pub_aquafooterlinks"] [data-esc-source-field="label"]');
   assert(await footerLabels.count()>0,'BUILDER_FOOTER_SOURCE_LABELS_MISSING');
   const mapped=await footer.locator('[data-esc-source-table="pub_aquafooterlinks"] [data-esc-builder-cell-field="label"]').count();
   console.log('FOOTER_LABEL_MAPPING_DIAGNOSTIC='+JSON.stringify({footerVersion,mapped,sourceLabels:await footerLabels.count()}));
   assert(/^[a-f0-9]{64}$/.test(footerVersion||'') && mapped>0,
     'BUILDER_FOOTER_GLOBAL_VERSION_OR_CELL_MAPPING_MISSING');
   const footerLabel=footer.locator('[data-esc-source-table="pub_aquafooterlinks"] [data-esc-builder-cell-field="label"]').first();
   await footerLabel.click();
   console.log('FOOTER_CLICK_STATE='+JSON.stringify({
     admin:await admin.evaluate(()=>({
       caption:document.querySelector('#esc-vb-edit-caption')?.textContent,
       options:[...document.querySelectorAll('#esc-vb-edit-row option')].map(x=>x.value).slice(0,45),
       status:document.querySelector('#esc-vb-edit-status')?.textContent,
       itemContext:document.querySelector('#esc-vb-item-context')?.textContent
     })),
     iframe:await footerGroup.evaluate(el=>({
       selected:el.hasAttribute('data-esc-builder-selected'),
       renderedVersion:el.getAttribute('data-esc-rendered-version'),
       sourceTable:el.getAttribute('data-esc-source-table')
     }))
   }));
   await admin.screenshot({path:'artifacts/footer-consultation-home05/footer-click-debug.png'});
   await admin.waitForFunction(()=>
     (document.querySelector('#esc-vb-edit-caption')?.textContent||'').includes('pub_aquafooterlinks') &&
     Boolean(document.querySelector('#esc-vb-edit-row option[value$=":label"]')),
     null,{timeout:20000});
   assert.equal(await admin.locator('#esc-vb-edit-title').isDisabled(),false,
     'BUILDER_FOOTER_LABEL_EDIT_DISABLED');
   console.log('FOOTER_CONSULTATION_FOOTER_LABEL_EDITOR_PASS');
   await admin.screenshot({path:'artifacts/footer-consultation-home05/builder.png'});
   console.log('FOOTER_CONSULTATION_HOME05_BUILDER_PASS');
   await admin.close();
  }
  console.log('FOOTER_CONSULTATION_HOME05_QA=PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error('FOOTER_CONSULTATION_HOME05_QA=FAIL '+(e.stack||e.message));process.exitCode=1;});
