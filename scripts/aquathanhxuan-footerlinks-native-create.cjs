// Idempotent native ESC Table authoring for the approved legacy footer copy.
// WRITE_SCOPE: exactly the global pub_aquafooterlinks table; no Page/Products changes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const wp='https://admin.aquathanhxuan.io.vn';
const tableId='pub_aquafooterlinks';
const rows=[
  ['group','label','href'],
  ['Nhóm','Tiêu đề','Liên kết'],
  ['featured','Đèn Chihiros','/san-pham?q=Chihiros'],
  ['featured','Lọc Thùng Atman','/san-pham?q=Atman'],
  ['featured','Phân nền dennerle','/san-pham?q=Dennerle'],
  ['featured','Vi sinh biodigest Probidio','/san-pham?q=Prodibio'],
  ['featured','Phân nước Tropica','/san-pham?q=Tropica'],
  ['support','Chính sách đổi trả hàng',''],
  ['support','Giới thiệu',''],
  ['support','Đại Lý',''],
  ['support','Khiếu nại',''],
  ['support','Liên hệ','#footer-contact'],
];
const editUrl=wp+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+tableId;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 page.setDefaultTimeout(24000);
 let createdTemp=null;
 page.on('dialog',async d=>{
   if(d.type()==='beforeunload'||d.type()==='confirm') await d.accept();
   else await d.dismiss();
 });
 try{
   assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WP credentials absent');
   await page.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded'});
   if(await page.locator('#user_login').count()){
     await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
     await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
     await page.locator('#wp-submit').click();
   }
   await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
   await page.goto(wp+'/wp-admin/admin.php?page=tablepress',{waitUntil:'domcontentloaded'});
   const exists=await page.locator('#cb-select-'+tableId).count()>0;
   if(!exists){
     await page.goto(wp+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded'});
     await page.locator('[name="table[name]"]').fill('Liên kết footer Aqua');
     await page.locator('[name="table[description]"]').fill('Nhóm sản phẩm nổi bật và hỗ trợ trên footer');
     await page.locator('[name="table[rows]"]').fill(String(rows.length));
     await page.locator('[name="table[columns]"]').fill('3');
     await page.getByRole('button',{name:'Add Table'}).click();
     await page.waitForURL(url=>url.searchParams.get('action')==='edit'&&url.searchParams.has('table_id'),{timeout:45000});
     createdTemp=new URL(page.url()).searchParams.get('table_id');
     assert(/^[A-Za-z0-9_-]+$/.test(createdTemp),'Generated temp ID invalid');
     await page.waitForFunction(()=>Boolean(window.tp?.editor?.setData));
     await page.locator('#table-id').fill(tableId);
     await page.locator('#table-id').press('Tab');
     await page.evaluate(value=>{
       window.tp.editor.setData(value);
       window.tp.helpers.unsaved_changes.set();
     },rows);
     assert.deepEqual(await page.evaluate(()=>window.tp.editor.getData()),rows);
     await page.getByRole('button',{name:'Save Changes'}).first().click();
     await page.waitForTimeout(2000);
   }
   await page.goto(editUrl,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData));
   const saved=await page.evaluate(()=>({
     id:document.querySelector('#table-id')?.value,
     rows:window.tp.editor.getData()
   }));
   assert.equal(saved.id,tableId);
   assert.deepEqual(saved.rows,rows,'Existing footer table does not match approved copy: refuse overwrite');
   console.log('AQUA_FOOTER_LINKS_NATIVE_PASS='+JSON.stringify({table:tableId,created:!exists,featured:5,support:5}));
 }catch(error){
   console.error('AQUA_FOOTER_LINKS_NATIVE_FAIL='+error.message);
   if(createdTemp) console.error('AQUA_FOOTER_LINKS_CREATED_TEMP='+createdTemp+'; verify cleanup before retry');
   process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error('AQUA_FOOTER_LINKS_FATAL='+e.message);process.exitCode=1;});
