'use strict';
// WRITE_SCOPE: append 'shell' label rows only to these three existing native ESC
// Tables: support_contact, support_complaint, support_dealer, support_policy,
// support_about. Never write
// WordPress Pages, customers, orders, coupons, payment methods, or other Tables.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const TARGETS=[
 {id:82718,table:'support_contact',slug:'lien-he'},
 {id:82716,table:'support_complaint',slug:'khieu-nai'},
 {id:82714,table:'support_dealer',slug:'dai-ly'},
 {id:82710,table:'support_policy',slug:'chinh-sach-doi-tra-hang'},
 {id:82712,table:'support_about',slug:'gioi-thieu'}
];
const LABELS=[
 ['breadcrumb_home','Trang chủ'],
 ['breadcrumb_support','Hỗ trợ'],
 ['breadcrumb_aria','Đường dẫn trang'],
 ['hero_badge','Aqua Thanh Xuân · Hỗ trợ khách hàng'],
 ['aside_aria','Kênh tư vấn'],
 ['article_aria','Nội dung trang hỗ trợ'],
 ['aside_title','Bạn cần hỗ trợ thêm?'],
 ['aside_description','Đội ngũ Aqua Thanh Xuân sẵn sàng trao đổi về sản phẩm, đơn hàng và các yêu cầu hỗ trợ.'],
 ['phone_prefix','Gọi'],
 ['zalo_link','Trao đổi qua Zalo'],
 ['facebook_link','Facebook Aqua Thanh Xuân'],
 ['address_title','Địa chỉ liên hệ'],
 ['section_eyebrow','Aqua Thanh Xuân']
];
const expectedFields=['kind','title','description','lucide-icon'];
const OUT='artifacts/aqua-support-shell';
fs.mkdirSync(OUT,{recursive:true});
const audit={result:'STARTED',changed:[],skipped:[],temporaryCreated:0,cleanupRemaining:0};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(audit,null,2)+'\n');
assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD,'Missing WordPress admin credentials');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage();
  page.setDefaultTimeout(25000);
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
    await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
    await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
    await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nonceRes=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceRes.status(),200,'REST nonce missing');
  const headers={'X-WP-Nonce':(await nonceRes.text()).trim()};
  for(const target of TARGETS){
    const pageRes=await page.request.get(WP+'/wp-json/wp/v2/pages/'+target.id+'?context=edit',{headers,timeout:40000});
    assert.equal(pageRes.status(),200,'Support Page not readable '+target.slug);
    const wpPage=await pageRes.json();
    assert.equal(wpPage.slug,target.slug,'Support Page slug mismatch');
    assert.equal(wpPage.acf?.action,'SupportPage','Support action mismatch');
    assert(String(wpPage.content?.raw||'').includes('[table id='+target.table+' /]'),
      'Native support section shortcode missing '+target.table);
    const endpoint=WP+'/wp-json/tablepress/v1/table/'+target.table+'?_shell='+Date.now();
    const tableRes=await page.request.get(endpoint,{headers,timeout:40000});
    assert.equal(tableRes.status(),200,'Native TablePress inaccessible '+target.table);
    const table=await tableRes.json();
    assert.deepEqual(table.fields?.map(f=>f.key),expectedFields,'Support Table schema changed');
    assert(Array.isArray(table.items)&&table.items.length>=8,'Missing support content');
    const present=table.items.filter(item=>String(item.kind||'').toLowerCase()==='shell');
    if(present.length){
      assert.equal(present.length,LABELS.length,'Partial shell migration '+target.table);
      for(const [key] of LABELS){
        const item=present.find(x=>x.title===key);
        assert(item&&String(item.description||'').trim(),'Missing shell key/label '+target.table+'.'+key);
      }
      audit.skipped.push(target.table);save();
      console.log('AQUA_SUPPORT_SHELL_SKIP_EXISTING='+target.table);
      continue;
    }
    // Native editor load preserves the exact customer-maintained current grid,
    // its content and row order. Only add new rows at the end.
    await page.goto(WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+target.table,
      {waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData&&window.tp?.editor?.setData),null,{timeout:25000});
    const before=await page.evaluate(()=>window.tp.editor.getData());
    assert(Array.isArray(before)&&before.length===table.items.length+2,'Native grid read mismatch');
    assert.deepEqual(before[0],expectedFields,'Native grid header mismatch');
    assert.deepEqual(before.slice(2).map(row=>String(row[1])),table.items.map(x=>String(x.title)),
      'Native table title readback mismatch');
    const newRows=[...before,...LABELS.map(([key,label])=>['shell',key,label,''])];
    // The native Save Changes button keeps the old row dimension after calling
    // setData() programmatically. Use its nonce-checked TablePress AJAX writer
    // with explicit new dimensions; preserve the table's existing options.
    const nonce=(await page.content()).match(/edit_table:\s*'([^']+)'/)?.[1];
    assert(nonce,'Native TablePress edit nonce missing '+target.table);
    const form=new URLSearchParams();
    for(const [key,value] of [
      ['action','tablepress_save_table'],['_ajax_nonce',nonce],
      ['tablepress[id]',target.table],['tablepress[new_id]',target.table],
      ['tablepress[name]',String(table.name||target.table)],
      ['tablepress[description]',String(table.description||'ESC support content')],
      ['tablepress[data]',JSON.stringify(newRows)],
      ['tablepress[options]',JSON.stringify(table.options||{})],
      ['tablepress[visibility]',JSON.stringify({rows:newRows.map(()=>1),columns:[1,1,1,1]})],
      ['tablepress[number][rows]',String(newRows.length)],
      ['tablepress[number][columns]','4'],
      ['custom_api',''],['custom_image',''],['custom_cols',''],['custom_rows','']
    ])form.append(key,value);
    const result=await page.evaluate(async body=>{
      const response=await fetch('/wp-admin/admin-ajax.php',{method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
        body});
      return {status:response.status,json:await response.json()};
    },form.toString());
    assert(result.status===200 && result.json?.success===true &&
      result.json?.table_id===target.table,'Native TablePress append failed '+target.table);
    await page.goto(WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+target.table,
      {waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:20000});
    const saved=await page.evaluate(()=>window.tp.editor.getData());
    assert.deepEqual(saved,newRows,'Native TablePress Save/readback mismatch '+target.table);
    audit.changed.push(target.table);save();
    console.log('AQUA_SUPPORT_SHELL_PASS='+target.table+' rows_added='+LABELS.length);
  }
  audit.result='PASS';save();
  console.log('AQUA_SUPPORT_SHELL_INSTALL_PASS changed='+audit.changed.length+
    ' skipped_unchanged='+audit.skipped.length+' temporary_created=0 cleanup_remaining=0');
 }finally{await browser.close();}
})().catch(err=>{audit.result='FAIL';audit.error=String(err.stack||err).slice(0,1400);save();
 console.error('AQUA_SUPPORT_SHELL_INSTALL_FAIL='+audit.error);process.exitCode=1;});