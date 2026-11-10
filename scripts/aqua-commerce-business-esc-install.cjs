'use strict';
// WRITE_SCOPE: only cart_ui_vi/checkout_ui_vi/checkout_done_ui_vi native ESC Tables and
// WordPress Pages #83808/#83810/#83812. No Woo order, customer, coupon, gateway or payment mutations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const targets=[
  {
    "id": 83808,
    "slug": "cart",
    "action": "CartPage",
    "key": "ssr-cart",
    "table": "cart_ui_vi",
    "name": "Giỏ hàng — nội dung giao diện",
    "labels": [
      [
        "cart",
        "Giỏ hàng"
      ],
      [
        "checkout",
        "Thanh toán"
      ],
      [
        "complete",
        "Hoàn tất"
      ],
      [
        "cart_title",
        "Giỏ hàng của bạn"
      ],
      [
        "cart_empty",
        "Giỏ hàng trống."
      ],
      [
        "cart_shop_now",
        "Tiếp tục mua sắm"
      ],
      [
        "cart_select",
        "Chọn một dòng"
      ],
      [
        "product",
        "Sản phẩm"
      ],
      [
        "quantity",
        "Số lượng"
      ],
      [
        "price",
        "Đơn giá"
      ],
      [
        "summary_title",
        "Tổng cộng"
      ],
      [
        "summary_total",
        "Tổng tiền"
      ],
      [
        "summary_subtotal",
        "Tạm tính"
      ],
      [
        "summary_discount",
        "Giảm giá"
      ],
      [
        "summary_tax",
        "Thuế"
      ],
      [
        "submit_button",
        "Tiến hành thanh toán"
      ],
      [
        "coupon_none",
        "Không có mã giảm giá"
      ],
      [
        "coupon_code",
        "Mã giảm giá"
      ],
      [
        "demo_product",
        "Sản phẩm thủy sinh minh họa"
      ],
      [
        "demo_notice",
        "Dữ liệu chỉ dùng trong Visual Builder"
      ]
    ]
  },
  {
    "id": 83810,
    "slug": "checkout",
    "action": "CheckoutPage",
    "key": "ssr-checkout",
    "table": "checkout_ui_vi",
    "name": "Thanh toán — nội dung giao diện",
    "labels": [
      [
        "cart",
        "Giỏ hàng"
      ],
      [
        "checkout",
        "Thanh toán"
      ],
      [
        "complete",
        "Hoàn tất"
      ],
      [
        "login_text",
        "Nếu trước đây bạn đã mua hàng của chúng tôi, vui lòng đăng nhập. Nếu bạn là khách hàng mới, vui lòng tiếp tục nhập phần thông tin thanh toán."
      ],
      [
        "login_username",
        "Nhập tài khoản hoặc email..."
      ],
      [
        "login_password",
        "Nhập mật khẩu"
      ],
      [
        "login_button",
        "Đăng nhập"
      ],
      [
        "login_remember",
        "Ghi nhớ mật khẩu"
      ],
      [
        "login_lost_password",
        "Quên mật khẩu?"
      ],
      [
        "billing_title",
        "Thông tin thanh toán"
      ],
      [
        "billing_personal",
        "Cá nhân"
      ],
      [
        "billing_organization",
        "Tổ chức"
      ],
      [
        "billing_name",
        "Họ và tên *"
      ],
      [
        "billing_id_number",
        "CCCD/MSDN"
      ],
      [
        "billing_phone",
        "Số điện thoại"
      ],
      [
        "billing_email",
        "Email *"
      ],
      [
        "billing_address",
        "Địa chỉ *"
      ],
      [
        "billing_create_account",
        "Tạo tài khoản mới?"
      ],
      [
        "billing_account_username",
        "Tài khoản (Email)"
      ],
      [
        "billing_account_username_placeholder",
        "Nhập email ở trên..."
      ],
      [
        "billing_account_password",
        "Mật khẩu mới *"
      ],
      [
        "billing_account_password_placeholder",
        "Nhập mật khẩu cho tài khoản mới"
      ],
      [
        "billing_note",
        "Ghi chú đơn hàng"
      ],
      [
        "cart_title",
        "Giỏ hàng của bạn"
      ],
      [
        "cart_empty",
        "Giỏ hàng trống."
      ],
      [
        "cart_shop_now",
        "Mua sắm"
      ],
      [
        "cart_select",
        "Chọn một dòng"
      ],
      [
        "summary_title",
        "Tổng cộng"
      ],
      [
        "summary_subtotal",
        "Tạm tính"
      ],
      [
        "summary_discount",
        "Giảm giá"
      ],
      [
        "summary_tax",
        "Thuế"
      ],
      [
        "payment_title",
        "Phương thức thanh toán"
      ],
      [
        "payment_bacs",
        "Chuyển khoản ngân hàng"
      ],
      [
        "payment_paypal",
        "PayPal (Đang bảo trì)"
      ],
      [
        "policy_privacy_text",
        "Thông tin cá nhân của bạn sẽ được sử dụng để xử lý đơn hàng, tăng trải nghiệm sử dụng website, và cho các mục đích cụ thể khác đã được mô tả trong"
      ],
      [
        "policy_privacy_link",
        "chính sách bảo mật"
      ],
      [
        "terms_text",
        "Tôi đồng ý với"
      ],
      [
        "terms_link",
        "Thỏa thuận sử dụng"
      ],
      [
        "terms_and",
        "và"
      ],
      [
        "terms_policy_link",
        "Chính sách bảo vệ dữ liệu cá nhân"
      ],
      [
        "submit_button",
        "Thanh toán"
      ],
      [
        "more_maintain",
        "Đang bảo trì"
      ],
      [
        "billing_region",
        "Tỉnh / Thành phố"
      ],
      [
        "billing_district",
        "Quận / Huyện / Phường"
      ],
      [
        "payment_cod",
        "Thanh toán khi nhận hàng"
      ],
      [
        "payment_loading",
        "Đang tải phương thức thanh toán..."
      ],
      [
        "payment_none",
        "Không có phương thức thanh toán khả dụng."
      ],
      [
        "payment_unavailable",
        "Thanh toán khi nhận hàng chưa khả dụng."
      ],
      [
        "payment_error",
        "Không thể tải phương thức thanh toán. Vui lòng tải lại trang."
      ],
      [
        "coupon_none",
        "Không có mã giảm giá"
      ],
      [
        "cart_empty_checkout",
        "Giỏ hàng của bạn đang trống"
      ],
      [
        "cart_shop_now_checkout",
        "Mua sắm ngay"
      ],
      [
        "privacy_suffix",
        "của chúng tôi."
      ],
      [
        "terms_suffix",
        "của Aqua Thanh Xuân."
      ],
      [
        "checkout_validation",
        "Vui lòng kiểm tra giỏ hàng, phương thức thanh toán và điều khoản."
      ],
      [
        "order_error",
        "Đặt hàng chưa thành công. Vui lòng kiểm tra và thử lại."
      ],
      [
        "network_error",
        "Không kết nối được máy chủ thanh toán. Vui lòng kiểm tra đơn hàng trước khi thử lại."
      ],
      [
        "demo_product",
        "Sản phẩm thủy sinh minh họa"
      ],
      [
        "demo_quantity",
        "Số lượng: 1"
      ]
    ]
  },
  {
    "id": 83812,
    "slug": "order-received",
    "action": "CheckoutDonePage",
    "key": "ssr-checkoutdone",
    "table": "checkout_done_ui_vi",
    "name": "Xác nhận đơn hàng — nội dung giao diện",
    "labels": [
      [
        "order_status_completed",
        "Hoàn thành"
      ],
      [
        "order_status_processing",
        "Đang xử lý"
      ],
      [
        "order_status_on_hold",
        "Chờ chuyển khoản"
      ],
      [
        "order_status_pending",
        "Chờ thanh toán"
      ],
      [
        "order_error_invalid_key",
        "Khóa đơn hàng không hợp lệ."
      ],
      [
        "order_error_not_found",
        "Không tìm thấy thông tin đơn hàng."
      ],
      [
        "order_error_server",
        "Lỗi kết nối máy chủ."
      ],
      [
        "order_error_missing_id",
        "Thiếu thông tin mã đơn hàng."
      ],
      [
        "order_error_title",
        "Không thể xem đơn hàng"
      ],
      [
        "order_back_home",
        "Quay về trang chủ"
      ],
      [
        "order_thank_you_title",
        "Cảm ơn bạn đã đặt hàng!"
      ],
      [
        "order_thank_you_desc_1",
        "Mã đơn hàng của bạn là"
      ],
      [
        "order_thank_you_desc_2",
        "Chúng tôi đã gửi email xác nhận chi tiết tới"
      ],
      [
        "order_id_label",
        "Mã đơn hàng"
      ],
      [
        "order_date_label",
        "Ngày đặt"
      ],
      [
        "order_status_label",
        "Trạng thái"
      ],
      [
        "order_total_label",
        "Tổng cộng"
      ],
      [
        "order_services_detail",
        "Chi tiết dịch vụ"
      ],
      [
        "order_item_quantity",
        "Số lượng"
      ],
      [
        "order_subtotal",
        "Tạm tính"
      ],
      [
        "order_discount",
        "Giảm giá"
      ],
      [
        "order_grand_total",
        "Tổng thanh toán"
      ],
      [
        "order_bank_transfer_title",
        "Thanh toán qua Mã QR / Chuyển khoản ngân hàng"
      ],
      [
        "order_bank_transfer_desc",
        "Mở App ngân hàng bất kỳ để quét mã QR (tự động nhập đúng Số tiền & Nội dung):"
      ],
      [
        "order_qr_instruction",
        "Quét bằng app MB, VCB, TCB, Momo..."
      ],
      [
        "order_bank_name",
        "Ngân hàng"
      ],
      [
        "order_bank_account_no",
        "Số tài khoản"
      ],
      [
        "order_bank_account_holder",
        "Chủ tài khoản"
      ],
      [
        "order_bank_amount",
        "Số tiền"
      ],
      [
        "order_bank_transfer_content",
        "Nội dung CK"
      ],
      [
        "order_billing_info",
        "Thông tin thanh toán"
      ],
      [
        "order_shipping_address",
        "Địa chỉ đăng ký"
      ],
      [
        "order_qr_missing",
        "Chưa thể tạo mã VietQR. Vui lòng xác minh thông tin tài khoản với cửa hàng trước khi chuyển khoản."
      ],
      [
        "order_qr_alt",
        "Mã VietQR thanh toán đơn hàng"
      ]
    ]
  }
];
const OUT='artifacts/aqua-commerce-esc';
fs.mkdirSync(OUT,{recursive:true});
assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD,'WP admin secret unavailable');
const audit={status:'STARTED',writes:[],targets:targets.map(t=>({id:t.id,table:t.table}))};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(audit,null,2)+'\n');
const shortcode = t=>'[table id='+t.table+' /]';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage();
  page.setDefaultTimeout(24000);
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nonceRes=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceRes.status(),200,'WordPress nonce request failed');
  const headers={'X-WP-Nonce':(await nonceRes.text()).trim()};
  const rest=async path=>{
    const r=await page.request.get(WP+path,{headers,timeout:35000,failOnStatusCode:false});
    return {status:r.status(),data:await r.json().catch(()=>null)};
  };
  for(const t of targets){
   assert.equal(new Set(t.labels.map(x=>x[0])).size,t.labels.length,'Duplicate label keys');
   const pageBefore=await rest('/wp-json/wp/v2/pages/'+t.id+'?context=edit');
   assert.equal(pageBefore.status,200,'Page unavailable '+t.id);
   const wpPage=pageBefore.data;
   assert(wpPage.status==='publish' && wpPage.slug===t.slug &&
     wpPage.acf?.key===t.key && wpPage.acf?.action===t.action,
     'Page identity mismatch: '+t.id);
   const raw=String(wpPage.content?.raw||'');
   const appearances=(raw.match(new RegExp('\\[table\\s+id=[\\x22\\x27]?'+t.table+'[\\x22\\x27]?\\s*\\/\\]','gi'))||[]).length;
   assert(appearances<=1,'Existing shortcode duplicated '+t.table);
   let table=await rest('/wp-json/tablepress/v1/table/'+t.table+'?_esc_verify='+Date.now());
   if(table.status===404){
    await page.goto(WP+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded',timeout:45000});
    await page.locator('[name="table[name]"]').fill(t.name);
    await page.locator('[name="table[description]"]').fill('Nhãn giao diện chỉnh sửa trên ESC Visual Builder; cột key cố định, chỉ sửa label.');
    await page.locator('[name="table[rows]"]').fill(String(t.labels.length+2));
    await page.locator('[name="table[columns]"]').fill('2');
    await page.getByRole('button',{name:'Add Table'}).click();
    await page.waitForURL(u=>u.searchParams.get('action')==='edit'&&Boolean(u.searchParams.get('table_id')),{timeout:45000});
    const generated=new URL(page.url()).searchParams.get('table_id');
    assert(/^[a-zA-Z0-9_-]+$/.test(generated||''),'Bad generated table ID');
    const nonce=(await page.content()).match(/edit_table:\s*'([^']+)'/)?.[1];
    assert(nonce,'Native TablePress edit nonce not found');
    const grid=[['key','label'],['Mã trường','Nội dung'],...t.labels];
    const form=new URLSearchParams();
    for(const [k,v] of [
      ['action','tablepress_save_table'],['_ajax_nonce',nonce],
      ['tablepress[id]',generated],['tablepress[new_id]',t.table],
      ['tablepress[name]',t.name],['tablepress[description]','Nội dung giao diện Visual Builder'],
      ['tablepress[data]',JSON.stringify(grid)],['tablepress[options]','{}'],
      ['tablepress[visibility]',JSON.stringify({rows:grid.map(()=>1),columns:[1,1]})],
      ['tablepress[number][rows]',String(grid.length)],['tablepress[number][columns]','2'],
      ['custom_api',''],['custom_image',''],['custom_cols',''],['custom_rows','']
    ])form.append(k,v);
    const result=await page.evaluate(async body=>{
      const r=await fetch('/wp-admin/admin-ajax.php',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body});
      return {status:r.status,json:await r.json()};
    },form.toString());
    assert(result.status===200&&result.json?.success===true&&result.json?.table_id===t.table,
      'Native TablePress create/save failed '+t.table+': '+JSON.stringify(result));
    audit.writes.push('Created '+t.table);save();
    table=await rest('/wp-json/tablepress/v1/table/'+t.table+'?_esc_verify='+Date.now());
   }
   assert.equal(table.status,200,'Cannot read native table '+t.table);
   assert.equal(table.data?.items?.length,t.labels.length,'Table label count mismatch '+t.table);
   assert(!String(table.data?.meta?.api||'').trim(),'Unexpected API source for '+t.table);
   for(let i=0;i<t.labels.length;i++){
    assert.equal(table.data.items[i].key,t.labels[i][0],'Table key modified '+t.table);
    assert(String(table.data.items[i].label||'').trim(),'Blank editor label '+t.table);
   }
   if(appearances===0){
    await page.goto(WP+'/wp-admin/post.php?post='+t.id+'&action=edit&esc_full_admin=1',
      {waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(await page.locator('#content').inputValue(),raw,'Editor content mismatch '+t.id);
    await page.evaluate(()=>{
      const editor=window.tinymce?.get('content');
      if(editor&&!editor.isHidden())editor.hide();
      const wrap=document.getElementById('wp-content-wrap');
      const area=document.getElementById('content');
      const insert=document.getElementById('qt_content_tablepress_quicktags_button');
      if(!(area instanceof HTMLTextAreaElement)||!wrap||!insert)throw Error('Classic Editor Insert Code button missing');
      wrap.classList.remove('tmce-active');
      wrap.classList.add('html-active');
      area.focus();area.setSelectionRange(area.value.length,area.value.length);
      window.wpActiveEditor='content';
    });
    await page.locator('#qt_content_tablepress_quicktags_button').click();
    const picker=page.frameLocator('#TB_iframeContent').locator('input.insert-shortcode[title="'+shortcode(t)+'"]');
    await picker.waitFor({state:'visible',timeout:20000});
    await picker.click();
    await page.waitForFunction(s=>document.getElementById('content')?.value.includes(s),shortcode(t),{timeout:20000});
    const edited=await page.locator('#content').inputValue();
    assert.equal(edited.split(shortcode(t)).length-1,1,'Multiple Insert Code blocks');
    assert(edited.includes('tablepress-preview-wrap') && edited.includes('data-table-id="'+t.table+'"'),
      'Native Insert Code wrapper missing '+t.table);
    const start=edited.lastIndexOf('<div',edited.indexOf(shortcode(t)));
    const end=edited.indexOf('</div>',edited.indexOf(shortcode(t)))+6;
    assert(start>=0&&end>start,'Unexpected Insert Code wrapper boundaries');
    assert.equal(edited.slice(0,start)+edited.slice(end),raw,'Native Insert Code changed unrelated page content');
    await page.locator('#publish').click();
    await page.waitForTimeout(1800);
    audit.writes.push('Insert Code Page '+t.id);save();
   }
   let pageAfter;
   let output='';
   // WordPress page edits can be saved before its REST object cache invalidates.
   // Re-query with a unique URL; never falsely report failed Insert Code or
   // insert a duplicate while the native save is still propagating.
   for(let attempt=0;attempt<7;attempt++){
     pageAfter=await rest('/wp-json/wp/v2/pages/'+t.id+
       '?context=edit&_esc_verify='+Date.now()+'_'+attempt);
     assert.equal(pageAfter.status,200,'WordPress Page readback failed');
     assert.equal(pageAfter.data.acf?.action,t.action);
     output=String(pageAfter.data.content?.raw||'');
     if(output.includes(shortcode(t)))break;
     if(attempt<6)await page.waitForTimeout(2000);
   }
   console.log('AQUA_COMMERCE_PAGE_READBACK='+JSON.stringify({
     id:t.id,shortcode:shortcode(t),rawSuffix:output.slice(-850),originalLength:raw.length,
     newLength:output.length,contains:output.includes(shortcode(t))
   }));
   assert.equal([...output.matchAll(new RegExp('\\[table\\s+id=[\\x22\\x27]?'+t.table+'[\\x22\\x27]?\\s*\\/\\]','gi'))].length,1,
     'Native shortcode absent/duplicated '+t.table);
   console.log('AQUA_BUSINESS_ESC_PAGE_PASS='+t.slug+' rows='+t.labels.length);
  }
  audit.status='PASS';save();
  console.log('AQUA_COMMERCE_ESC_INSTALL_PASS pages='+targets.length);
 }finally{await browser.close();}
})().catch(err=>{audit.status='FAIL';audit.error=String(err.stack||err).slice(0,1600);save();
 console.error('AQUA_COMMERCE_ESC_INSTALL_FAIL '+audit.error);process.exitCode=1;});
