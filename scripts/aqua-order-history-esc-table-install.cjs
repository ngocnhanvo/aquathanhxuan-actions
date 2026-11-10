'use strict';
// WRITE_SCOPE: only native TablePress "order_history_vi" and WP Page #83821 post_content.
// No orders, customers, products, coupons, other pages, or other ESC Tables are written.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const WP = 'https://admin.aquathanhxuan.io.vn', TABLE = 'order_history_vi', PAGE_ID = 83821;
const OUT = 'artifacts/aqua-order-history-esc-table';
fs.mkdirSync(OUT, {recursive:true});
assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD, 'Missing WordPress admin credentials');
const labels = [
 ['title','Lịch sử đơn hàng'],
 ['loading','Đang tải lịch sử đơn hàng...'],
 ['search_label','Tìm kiếm đơn hàng'],
 ['search_placeholder','Nhập mã đơn, tên sản phẩm hoặc trạng thái...'],
 ['search_button','Tìm kiếm'],
 ['search_clear','Xóa tìm kiếm'],
 ['search_no_result','Không tìm thấy đơn hàng phù hợp.'],
 ['search_loading','Đang tìm kiếm đơn hàng...'],
 ['search_more','Xem thêm đơn hàng'],
 ['empty','Bạn chưa có đơn hàng nào.'],
 ['error','Không thể tải danh sách đơn hàng.'],
 ['network_error','Lỗi kết nối mạng, vui lòng thử lại sau!'],
 ['order_code','Mã đơn'],
 ['quantity','Số lượng'],
 ['coupon','Mã'],
 ['discount','Giảm giá'],
 ['tax','Thuế (VAT)'],
 ['payment','Hình thức'],
 ['subtotal','Thành tiền'],
 ['total','Tổng thanh toán'],
 ['status_pending','Chờ thanh toán'],
 ['status_processing','Đang xử lý'],
 ['status_on_hold','Tạm giữ'],
 ['status_completed','Hoàn thành'],
 ['status_cancelled','Đã hủy'],
 ['status_refunded','Đã hoàn tiền'],
 ['status_failed','Thất bại'],
 ['search_limit','Kết quả tìm kiếm đã đạt giới hạn hiển thị. Vui lòng tìm bằng mã đơn cụ thể.']
];
const keys = labels.map(x=>x[0]); assert.equal(keys.length,new Set(keys).size);
const snapshot = {table:TABLE,page:PAGE_ID,writes:[],result:'STARTED'};
const save = ()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(snapshot,null,2)+'\n');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(24000);
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nonceRes=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceRes.status(),200,'REST nonce HTTP');
  const headers={'X-WP-Nonce':(await nonceRes.text()).trim()};
  const rest=async url=>{
   const response=await page.request.get(WP+url,{headers,timeout:35000,failOnStatusCode:false});
   return {status:response.status(),data:await response.json().catch(()=>null)};
  };
  let r=await rest('/wp-json/tablepress/v1/table/'+TABLE+'?_esc_verify='+Date.now());
  if(r.status===404){
   await page.goto(WP+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('[name="table[name]"]').fill('Lịch sử mua hàng — nội dung giao diện');
   await page.locator('[name="table[description]"]').fill('Các nhãn hiển thị trong lịch sử mua hàng; sửa cột label bằng ESC Visual Builder.');
   await page.locator('[name="table[rows]"]').fill(String(labels.length+2));
   await page.locator('[name="table[columns]"]').fill('2');
   await page.getByRole('button',{name:'Add Table'}).click();
   await page.waitForURL(u=>u.searchParams.get('action')==='edit'&&Boolean(u.searchParams.get('table_id')),{timeout:45000});
   const generated=new URL(page.url()).searchParams.get('table_id');
   assert(/^[a-zA-Z0-9_-]+$/.test(generated||''),'Invalid generated table id');
   const saveNonce=(await page.content()).match(/edit_table:\s*'([^']+)'/)?.[1];
   assert(saveNonce,'Native TablePress nonce not found');
   const grid=[['key','label'],['Mã trường','Nội dung'],...labels];
   const form=new URLSearchParams();
   for(const [key,value] of [
     ['action','tablepress_save_table'],['_ajax_nonce',saveNonce],
     ['tablepress[id]',generated],['tablepress[new_id]',TABLE],
     ['tablepress[name]','Lịch sử mua hàng — nội dung giao diện'],
     ['tablepress[description]','Nhãn hiển thị của trang, điều chỉnh qua ESC Visual Builder'],
     ['tablepress[data]',JSON.stringify(grid)],['tablepress[options]','{}'],
     ['tablepress[visibility]',JSON.stringify({rows:grid.map(()=>1),columns:[1,1]})],
     ['tablepress[number][rows]',String(grid.length)],['tablepress[number][columns]','2'],
     ['custom_api',''],['custom_image',''],['custom_cols',''],['custom_rows','']
   ])form.append(key,value);
   const result=await page.evaluate(async data=>{
     const res=await fetch('/wp-admin/admin-ajax.php',{method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:data});
     return {status:res.status,json:await res.json()};
   },form.toString());
   assert(result.status===200 && result.json?.success===true && result.json?.table_id===TABLE,
     'Save native TablePress failed: '+JSON.stringify(result));
   snapshot.writes.push('native ESC Table '+TABLE);save();
   r=await rest('/wp-json/tablepress/v1/table/'+TABLE+'?_esc_verify='+Date.now());
  }
  assert.equal(r.status,200,'Cannot read published TablePress');
  assert(!String(r.data?.meta?.api||'').trim(),'Unexpected ESC Table API source');
  assert.equal(r.data?.items?.length,labels.length,'Unexpected number of label rows');
  for(let i=0;i<labels.length;i++){
   assert.equal(r.data.items[i].key,labels[i][0],'ESC Table key order mismatch');
   assert(String(r.data.items[i].label||'').trim(),'Existing label empty '+labels[i][0]);
  }
  console.log('ORDER_HISTORY_ESC_TABLE_PASS rows='+labels.length);

  const pr=await rest('/wp-json/wp/v2/pages/'+PAGE_ID+'?context=edit');
  assert.equal(pr.status,200);
  const p=pr.data;
  assert.equal(p.slug,'lich-su-mua-hang');
  assert.equal(p.acf?.key,'ssr-order-history');
  assert.equal(p.acf?.action,'OrderHistoryPage');
  assert.equal(p.status,'publish');
  const content=String(p.content?.raw||'');
  const shortcode='[table id='+TABLE+' /]';
  const count=(content.match(/(?:\[\s*table\s+id=order_history_vi\s*\/\])/g)||[]).length;
  assert(count<=1,'Duplicate shortcode in existing page');
  if(!count){
   await page.goto(WP+'/wp-admin/post.php?post='+PAGE_ID+'&action=edit&esc_full_admin=1',
     {waitUntil:'domcontentloaded',timeout:60000});
   const editorContent=await page.locator('#content').inputValue();
   assert.equal(editorContent,content,'Native editor content differs from WordPress REST');
   const state=await page.evaluate(()=>{
     const editor=window.tinymce?.get('content');
     if(editor && !editor.isHidden())editor.hide();
     const wrap=document.getElementById('wp-content-wrap');
     const textarea=document.getElementById('content');
     const button=document.getElementById('qt_content_tablepress_quicktags_button');
     if(!(textarea instanceof HTMLTextAreaElement)||!wrap||!button)throw Error('Native Classic Editor/Quicktags missing');
     wrap.classList.remove('tmce-active');wrap.classList.add('html-active');
     textarea.focus();
     textarea.setSelectionRange(textarea.value.length,textarea.value.length);
     window.wpActiveEditor='content';
     return {length:textarea.value.length,insertButton:button.id};
   });
   assert.equal(state.length,content.length);
   await page.locator('#qt_content_tablepress_quicktags_button').click();
   const picker=page.frameLocator('#TB_iframeContent').locator('input.insert-shortcode[title="'+shortcode+'"]');
   await picker.waitFor({state:'visible',timeout:20000});
   await picker.click();
   await page.waitForFunction(s=>document.getElementById('content')?.value.includes(s),shortcode,{timeout:20000});
   const edited=await page.locator('#content').inputValue();
   assert.equal(edited.split(shortcode).length-1,1);
   assert(edited.includes('tablepress-preview-wrap')&&edited.includes('data-table-id="'+TABLE+'"'),
     'Native Insert Code did not create preview wrapper');
   // Confirm only one insertion; other existing blocks remain unchanged.
   const start=edited.lastIndexOf('<div',edited.indexOf(shortcode));
   const end=edited.indexOf('</div>',edited.indexOf(shortcode))+6;
   assert(start>=0&&end>start);
   assert.equal(edited.slice(0,start)+edited.slice(end),content,'Native insertion altered existing Page content');
   await page.locator('#publish').click();
   await page.waitForTimeout(1800);
   snapshot.writes.push('Insert Code to WP Page '+PAGE_ID);save();
  }
  const verify=await rest('/wp-json/wp/v2/pages/'+PAGE_ID+'?context=edit');
  assert.equal(verify.status,200);
  const finalText=String(verify.data.content?.raw||'');
  assert.equal(finalText.split(shortcode).length-1,1,'Published Page shortcode missing or duplicated');
  assert.equal(verify.data.acf?.action,'OrderHistoryPage');
  snapshot.result='PASS';save();
  console.log('ORDER_HISTORY_ESC_CMS_PASS table='+TABLE+' page='+PAGE_ID+' writes='+snapshot.writes.length);
 } finally{await browser.close();}
})().catch(e=>{snapshot.result='FAIL';snapshot.error=String(e.stack||e).slice(0,1800);save();
 console.error('ORDER_HISTORY_ESC_CMS_FAIL '+snapshot.error);process.exitCode=1;});
