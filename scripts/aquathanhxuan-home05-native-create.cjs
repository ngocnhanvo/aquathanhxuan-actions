// Native WordPress ESC Table authoring for the four benefits in approved handoff.
// Only creates home_05, never mutates other ESC Tables or homepage content.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const vars=Object.fromEntries((process.env.ENV_FILE||'').split(/\r?\n/)
  .map(line=>line.match(/^\s*(WC_URL|WC_URL_CLIENT)\s*=\s*(.*?)\s*$/)).filter(Boolean)
  .map(m=>[m[1],m[2].replace(/^['"]|['"]$/g,'')]));
assert.equal(vars.WC_URL,'https://admin.aquathanhxuan.io.vn');
assert.equal(vars.WC_URL_CLIENT,'https://aquathanhxuan.io.vn');
assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WordPress credentials missing');

const id='home_05';
const header=['title','description','lucide-icon'];
const rows=[
  header,
  ['Tiêu đề','Mô tả','Biểu tượng'],
  ['Sản phẩm','Nhập khẩu và phân phối chính hãng, được chọn lọc và kiểm tra kỹ trước khi giao tới tay khách hàng.','package-check'],
  ['Giao hàng','Đơn hàng được xử lý và giao đi ngay khi có xác nhận.','truck'],
  ['Hỗ trợ','Khách hàng được hỗ trợ tư vấn miễn phí 24/7.','headset'],
  ['Bảo hành','Sản phẩm được bảo hành theo chính sách nhà sản xuất.','shield-check']
];
const editUrl=vars.WC_URL+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+id;
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext();
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(45000);
  let createdTemp=null;
  page.on('dialog',async dialog=>{
    if(dialog.type()==='beforeunload'||(dialog.type()==='confirm'&&/table\s*id/i.test(dialog.message())))
      await dialog.accept();
    else await dialog.dismiss();
  });
  try {
    await page.goto(vars.WC_URL+'/wp-login.php',{waitUntil:'domcontentloaded'});
    if(await page.locator('#user_login').count()){
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
    await page.goto(vars.WC_URL+'/wp-admin/admin.php?page=tablepress',{waitUntil:'domcontentloaded'});
    if(await page.locator('#cb-select-'+id).count()){
      // An earlier run may already have succeeded. Never recreate or overwrite.
      await page.goto(editUrl,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData));
      const existing=await page.evaluate(()=>window.tp.editor.getData());
      const sameStructure = existing.length === rows.length &&
        existing.every((line,i)=>Array.isArray(line) && line[0] === rows[i][0] &&
          (i<2 ? JSON.stringify(line)===JSON.stringify(rows[i]) : line[2]===rows[i][2]));
      assert(sameStructure,'Existing home_05 has unexpected rows/icons: refuse mutation');
      const alreadyCurrent = JSON.stringify(existing)===JSON.stringify(rows);
      if (!alreadyCurrent) {
        assert(existing.slice(2).every(line=>line[1]===''),
          'Existing nonempty descriptions require manual review: refuse overwrite');
        await page.evaluate(value=>{
          window.tp.editor.setData(value);
          window.tp.helpers.unsaved_changes.set();
        },rows);
        await page.getByRole('button',{name:'Save Changes'}).first().click();
        await page.waitForTimeout(2000);
        await page.goto(editUrl,{waitUntil:'domcontentloaded',timeout:45000});
        await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData));
        assert.deepEqual(await page.evaluate(()=>window.tp.editor.getData()),rows,
          'Description write did not persist in native TablePress');
      }
      const existingName=await page.locator('#table-name').count()
        ? await page.locator('#table-name').inputValue() : '';
      if (existingName) assert.equal(existingName,'Lợi ích khách hàng','existing table name mismatch');
      console.log('HOME05_NATIVE_TABLE=PASS_'+(alreadyCurrent?'UNCHANGED':'DESCRIPTIONS_UPDATED')+' name_readback='+JSON.stringify(existingName));
      return;
    }
    await page.goto(vars.WC_URL+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded'});
    await page.locator('[name="table[name]"]').fill('Lợi ích khách hàng');
    await page.locator('[name="table[description]"]').fill('');
    await page.locator('[name="table[rows]"]').fill(String(rows.length));
    await page.locator('[name="table[columns]"]').fill(String(header.length));
    await page.getByRole('button',{name:'Add Table'}).click();
    await page.waitForURL(url=>url.searchParams.get('action')==='edit'&&Boolean(url.searchParams.get('table_id')),{timeout:45000});
    createdTemp=new URL(page.url()).searchParams.get('table_id');
    assert(/^[0-9a-zA-Z_-]+$/.test(createdTemp),'temporary ID invalid');
    console.log('HOME05_CREATED_TEMP_TABLE='+createdTemp);
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.setData),null,{timeout:20000});
    await page.locator('#table-id').fill(id);
    await page.locator('#table-id').press('Tab'); // native rename/confirmation
    await page.evaluate(value=>{
      window.tp.editor.setData(value);
      window.tp.helpers.unsaved_changes.set();
    },rows);
    assert.deepEqual(await page.evaluate(()=>window.tp.editor.getData()),rows,
      'Home 05 native grid differs before save');
    await page.getByRole('button',{name:'Save Changes'}).first().click();
    await page.waitForTimeout(2500);
    await page.goto(editUrl,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:20000});
    const saved=await page.evaluate(()=>({
      id:document.getElementById('table-id')?.value,
      data:window.tp.editor.getData(),
      name:document.getElementById('table-name')?.value || ''
    }));
    assert.equal(saved.id,id,'native table ID not persisted');
    assert.deepEqual(saved.data,rows,'native TablePress read-after-write mismatch');
    // TablePress Add form and Edit form use different selectors.
    // The table name is checked if the edit UI exposes its native field.
    if (saved.name) assert.equal(saved.name,'Lợi ích khách hàng','section name mismatch');
    console.log('HOME05_NATIVE_TABLE=PASS '+JSON.stringify({
      table:id,features:4,columns:header,iconNames:rows.slice(2).map(r=>r[2])
    }));
  }catch(error){
    console.error('HOME05_NATIVE_TABLE=FAIL '+error.message);
    if(createdTemp)console.error('HOME05_RECOVERY_REQUIRED='+createdTemp+' (do not recreate without inventory)');
    process.exitCode=1;
  }finally{await browser.close();}
})().catch(error=>{console.error('HOME05_FATAL='+error.message);process.exitCode=1;});
