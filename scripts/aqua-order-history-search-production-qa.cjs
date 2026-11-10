'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const ORIGIN='https://aquathanhxuan.io.vn';
const WP='https://admin.aquathanhxuan.io.vn';
const OUT='artifacts/aqua-order-history-search';
fs.mkdirSync(OUT,{recursive:true});
const sample=(number,name,status='completed')=>({
  id:Number(number),number:String(number),date:'10/11/2026 20:00',status,
  items:[{id:1,name,quantity:1,price:'100.000 đ',subtotal:'100.000 đ',image:'',meta:[]}],
  coupons:[],paymentMethod:'Thanh toán khi nhận hàng',
  subtotal:'100.000 đ',total:'100.000 đ',discountTotal:'0 đ',taxTotal:'0 đ'
});
const reply=(orders,opts={})=>({ok:true,orders,hasMore:false,truncated:false,...opts});
async function run(){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const desktop=await browser.newContext({viewport:{width:1440,height:900}});
    const page=await desktop.newPage();
    const calls=[];
    await page.route('**/api/user/order**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname!=='/api/user/order')return route.continue();
      calls.push({q:url.searchParams.get('q'),page:url.searchParams.get('page'),status:url.searchParams.get('status')});
      const q=url.searchParams.get('q')||'';
      let data;
      if(q==='Chihiros')data=reply([sample(222,'Đèn Chihiros')]);
      else if(q==='Hoàn thành')data=reply([sample(333,'Sản phẩm đã hoàn thành')]);
      else if(q)data=reply([]);
      else if(url.searchParams.get('page')==='2')data=reply([sample(110,'Bể thủy sinh')]);
      else data=reply([sample(111,'Bộ lọc')],{hasMore:true});
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    const response=await page.goto(ORIGIN+'/lich-su-mua-hang',{waitUntil:'domcontentloaded',timeout:50000});
    assert(response&&response.status()===200,'Order history public page must be 200');
    await page.locator('[data-aqua-order-history-table] h1').waitFor({state:'visible'});
    assert.equal(await page.locator('[data-aqua-order-history-table]').getAttribute('data-esc-source-table'),'order_history_vi');
    const raw=await page.locator('#order-history-app').getAttribute('data-order-labels');
    const labels=JSON.parse(raw||'{}');
    assert.equal(labels.title,'Lịch sử đơn hàng');
    assert.equal(labels.search_label,'Tìm kiếm đơn hàng');
    assert(Object.keys(labels).length>=38,'WordPress labels must load from complete native ESC Table');
    const search=page.locator('#order-search-query');
    await search.waitFor({state:'visible',timeout:20000});
    await page.getByText('Mã đơn: #111').waitFor({state:'visible'});
    await page.locator('#order-load-more').click();
    await page.getByText('Mã đơn: #110').waitFor({state:'visible'});
    assert.equal(await page.getByText(/Mã đơn: #/).count(),2,'Load-more should append instead of replacing');
    console.log('ORDER_HISTORY_PAGINATION_PASS');

    await search.fill('Chihiros');
    await page.locator('#order-search-form button[type="submit"]').click();
    await page.getByText('Mã đơn: #222').waitFor({state:'visible'});
    assert.equal(await page.getByText(/Mã đơn: #/).count(),1,'Search must replace previous list');
    assert(calls.some(x=>x.q==='Chihiros'),'Search query not sent to customer endpoint');
    await page.screenshot({path:OUT+'/desktop-search.png',fullPage:false});
    console.log('ORDER_HISTORY_SEARCH_BY_PRODUCT_PASS');

    await search.fill('Hoàn thành');
    await page.locator('#order-search-form button[type="submit"]').click();
    await page.getByText('Mã đơn: #333').waitFor({state:'visible'});
    assert(calls.some(x=>x.q==='Hoàn thành'&&x.status==='completed'),
      'Localized CMS status label must map to secure Woo status hint');
    console.log('ORDER_HISTORY_SEARCH_LOCALIZED_STATUS_PASS');

    await search.fill('not-found-qa');
    await page.locator('#order-search-form button[type="submit"]').click();
    await page.getByText(labels.search_no_result).waitFor({state:'visible'});
    await page.locator('#order-search-clear').click();
    await page.getByText('Mã đơn: #111').waitFor({state:'visible'});
    console.log('ORDER_HISTORY_EMPTY_AND_CLEAR_PASS');
    await desktop.close();

    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mobilePage=await mobile.newPage();
    await mobilePage.route('**/api/user/order**',route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify(reply([sample(200,'Bộ lọc thủy sinh')]))
    }));
    await mobilePage.goto(ORIGIN+'/lich-su-mua-hang',{waitUntil:'domcontentloaded',timeout:50000});
    await mobilePage.locator('#order-search-query').waitFor({state:'visible'});
    const overflow=await mobilePage.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert(overflow<=2,'Mobile horizontal overflow '+overflow);
    await mobilePage.screenshot({path:OUT+'/mobile-search.png',fullPage:false});
    await mobile.close();
    console.log('ORDER_HISTORY_SEARCH_MOBILE_PASS');

    const guest=await browser.newPage();
    await guest.route('**/api/user/order**',route=>route.fulfill({
      status:401,contentType:'application/json',body:JSON.stringify({ok:false})
    }));
    await guest.goto(ORIGIN+'/lich-su-mua-hang',{waitUntil:'domcontentloaded',timeout:50000});
    await guest.locator('#login-form-wrapper').waitFor({state:'visible',timeout:15000});
    await guest.getByText('Tên đăng nhập hoặc Email').waitFor({state:'visible'});
    assert.equal(await guest.locator('#login-form input[name="username"]').getAttribute('placeholder'),
      'Nhập email hoặc tên tài khoản');
    assert.equal(await guest.locator('#login-form a').filter({hasText:'Quên mật khẩu?'}).count(),1);
    assert.equal(await guest.locator('#order-search-form').isVisible(),false,
      'Guest must not see private order search');
    await guest.close();
    console.log('ORDER_HISTORY_SEARCH_GUEST_PROTECTION_PASS');

    if(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD){
      const admin=await browser.newPage({viewport:{width:1440,height:900}});
      await admin.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
      if(await admin.locator('#user_login').count()){
        await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
        await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
        await admin.locator('#wp-submit').click();
      }
      await admin.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:40000});
      await admin.goto(WP+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page=83821',
        {waitUntil:'domcontentloaded',timeout:65000});
      const block=admin.frameLocator('#esc-vb-frame').locator('[data-aqua-order-history-table]');
      await block.waitFor({state:'visible',timeout:50000});
      const coords=await block.evaluate(el=>({
        table:el.dataset.escSourceTable,
        version:el.dataset.escRenderedVersion,
        count:el.querySelectorAll('[data-esc-source-row]').length,
        labelNodes:el.querySelectorAll('[data-esc-source-field="label"]').length,
        valid:[...el.querySelectorAll('[data-esc-source-field="label"]')]
          .every(item=>item.dataset.escBuilderCellField==='label'&&
            /^\d+$/.test(String(item.dataset.escBuilderCellRow||'')))
      }));
      assert.equal(coords.table,'order_history_vi');
      assert.match(coords.version||'',/^[a-f0-9]{64}$/);
      assert(coords.count>=38&&coords.labelNodes>=38&&coords.valid,
        'Builder must expose all label fields with valid row + version coordinates: '+JSON.stringify(coords));
      await block.locator('h1').click();
      await admin.waitForFunction(()=>Boolean(document.querySelector('#esc-vb-edit-row option[value="0:label"]')) &&
      Boolean(document.querySelector('#esc-vb-edit-row option[value="37:label"]')),null,{timeout:20000});
      assert.equal(await admin.locator('#esc-vb-edit-title').isDisabled(),false);
      console.log('ORDER_HISTORY_ESC_VISUAL_BUILDER_EDITABLE_PASS rows='+coords.labelNodes);
      await admin.screenshot({path:OUT+'/builder-labels.png',fullPage:false});
      await admin.close();
    }
    console.log('AQUA_ORDER_HISTORY_SEARCH_PRODUCTION_QA_PASS NO_ORDERS NO_CUSTOMERS NO_CMS_WRITES');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error('AQUA_ORDER_HISTORY_SEARCH_PRODUCTION_QA_FAIL '+(error.stack||error));process.exitCode=1});
