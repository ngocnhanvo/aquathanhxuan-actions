'use strict';
// WRITE_SCOPE: only lost_password_vi/reset_password_vi native ESC Tables and
// WordPress Pages #83827/#83829. No order, customer, mail, coupon or password mutations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const targets=[
  {id:83827, slug:'quen-mat-khau', action:'LostPassPage', key:'lostpass', table:'lost_password_vi',
   name:'Quên mật khẩu — nội dung giao diện',
   labels:[
    ['title','Quên mật khẩu?'],
    ['description','Nhập tên đăng nhập hoặc email. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu đến địa chỉ email đã đăng ký.'],
    ['preview_success','Nếu tài khoản tồn tại, email hướng dẫn đặt lại mật khẩu sẽ được gửi.'],
    ['preview_error','Chưa thể xử lý yêu cầu. Vui lòng thử lại.'],
    ['identity_label','Tên đăng nhập hoặc email'],
    ['identity_placeholder','Nhập tên tài khoản hoặc email'],
    ['submit','Gửi liên kết đặt lại mật khẩu'],
    ['back_to_login','Quay lại đăng nhập'],
    ['sending','Đang gửi...'],
    ['sent_success','Nếu tài khoản tồn tại, email hướng dẫn đặt lại mật khẩu sẽ được gửi. Hãy kiểm tra cả hộp thư rác.'],
    ['request_error','Chưa thể xử lý yêu cầu. Vui lòng thử lại.'],
    ['network_error','Lỗi kết nối. Vui lòng thử lại.']
   ]},
  {id:83829, slug:'dat-lai-mat-khau', action:'ResetPassPage', key:'resetpass', table:'reset_password_vi',
   name:'Đặt lại mật khẩu — nội dung giao diện',
   labels:[
    ['title','Đặt lại mật khẩu'],
    ['description','Nhập mật khẩu mới cho tài khoản của bạn.'],
    ['preview_success','Mật khẩu của bạn đã được cập nhật.'],
    ['preview_error','Liên kết không hợp lệ hoặc đã hết hạn.'],
    ['password_label','Mật khẩu mới'],
    ['password_hint','Sử dụng ít nhất 8 ký tự.'],
    ['confirm_label','Nhập lại mật khẩu mới'],
    ['submit','Cập nhật mật khẩu'],
    ['sign_in','Đăng nhập ngay'],
    ['new_link','Yêu cầu liên kết mới'],
    ['missing_token','Liên kết không hợp lệ hoặc thiếu thông tin. Vui lòng yêu cầu liên kết mới.'],
    ['too_short','Mật khẩu phải có ít nhất 8 ký tự.'],
    ['strength_short','Quá ngắn'],
    ['strength_good','Mạnh'],
    ['strength_ok','Đạt yêu cầu'],
    ['mismatch','Mật khẩu xác nhận không trùng khớp.'],
    ['saving','Đang cập nhật...'],
    ['invalid_token','Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.'],
    ['saved_success','Đã đổi mật khẩu thành công. Bạn có thể đăng nhập ngay.'],
    ['network_error','Lỗi kết nối. Vui lòng thử lại.']
   ]}
];
const OUT='artifacts/aqua-password-esc';
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
   const pageAfter=await rest('/wp-json/wp/v2/pages/'+t.id+'?context=edit');
   assert.equal(pageAfter.status,200,'WordPress Page readback failed');
   assert.equal(pageAfter.data.acf?.action,t.action);
   const output=String(pageAfter.data.content?.raw||'');
   assert.equal([...output.matchAll(new RegExp('\\[table\\s+id=[\\x22\\x27]?'+t.table+'[\\x22\\x27]?\\s*\\/\\]','gi'))].length,1,
     'Native shortcode absent/duplicated '+t.table);
   console.log('AQUA_BUSINESS_ESC_PAGE_PASS='+t.slug+' rows='+t.labels.length);
  }
  audit.status='PASS';save();
  console.log('AQUA_BUSINESS_ESC_INSTALL_PASS pages='+targets.length);
 }finally{await browser.close();}
})().catch(err=>{audit.status='FAIL';audit.error=String(err.stack||err).slice(0,1600);save();
 console.error('AQUA_BUSINESS_ESC_INSTALL_FAIL '+audit.error);process.exitCode=1;});
