// Home_03 native ESC Table writer. Scope: verified real combo product + newly created table only, never page content.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const vars=Object.fromEntries((process.env.ENV_FILE||'').split(/\r?\n/).map(x=>x.match(/^\s*(WC_URL|WC_URL_CLIENT)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(x=>[x[1],x[2].replace(/^['"]|['"]$/g,'')]));
assert.equal(vars.WC_URL,'https://admin.aquathanhxuan.io.vn');
assert.equal(vars.WC_URL_CLIENT,'https://aquathanhxuan.io.vn');
assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD,'missing authenticated CMS credentials');
const BASE=vars.WC_URL;
const EDIT='/wp-admin/admin.php?page=tablepress&action=edit&table_id=';
const LIST='/wp-admin/admin.php?page=tablepress';
const EXPECTED=['title','description','image','button_label','button_href'];
const mediaId='82476';
const imagePath='/wp-content/uploads/2026/11/Thiet-ke-chua-co-ten.png';
let createdId=null, committed=false;
const browserFlow=async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({acceptDownloads:false});
 page.setDefaultTimeout(18000);
 page.on('dialog', async dialog=>{ if(dialog.type()==='beforeunload') await dialog.accept(); else if(dialog.type()==='confirm' && /table\s*id/i.test(dialog.message())) await dialog.accept(); else await dialog.dismiss(); });
 try {
  await page.goto(BASE+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:30000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:30000});
  await page.goto(BASE+LIST,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#cb-select-home_03').count(),0,'home_03 already exists; refuse overwrite');
  const productResponse=await page.request.get(BASE+'/wp-json/wc/store/v1/products/82477');
  assert.equal(productResponse.status(),200,'canonical WooCommerce combo product missing');
  const product=await productResponse.json();
  assert.equal(product.id,82477,'combo product ID mismatch');
  assert.equal(product.name,'Combo bể cubic 40 siêu trong','combo product title mismatch');
  assert.equal(new URL(product.permalink).pathname,'/san-pham/combo-be-cubic-40-sieu-trong/','product permalink mismatch');
  assert((product.images||[]).some(image=>String(image.id)===mediaId),'combo product not linked to approved Media ID');
  console.log('REAL_COMBO_PRODUCT_VERIFIED='+JSON.stringify({id:product.id,name:product.name,mediaId}));
  const originMedia=await page.request.get(BASE+'/wp-json/wp/v2/media/'+mediaId);
  assert.equal(originMedia.status(),200,'media ID absent on WordPress origin');
  const media=await originMedia.json();
  assert((media.source_url||'').endsWith(imagePath),'media ID/path mismatch');
  console.log('MEDIA_VERIFIED='+JSON.stringify({id:media.id,title:media.title?.rendered,path:imagePath}));
  await page.goto(BASE+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded'});
  await page.locator('[name="table[name]"]').fill('Hot combo');
  await page.locator('[name="table[description]"]').fill('');
  await page.locator('[name="table[rows]"]').fill('3');
  await page.locator('[name="table[columns]"]').fill('5');
  await page.getByRole('button',{name:'Add Table'}).click();
  await page.waitForURL(u=>u.searchParams.get('action')==='edit' && Boolean(u.searchParams.get('table_id')),{timeout:30000});
  createdId=new URL(page.url()).searchParams.get('table_id');
  assert(/^[0-9A-Za-z_-]+$/.test(createdId),'unexpected created table id');
  console.log('CREATED_TEMP_TABLE='+createdId);
  await page.waitForFunction(()=>Boolean(window.tp?.editor?.setData),null,{timeout:20000});
  await page.locator('#table-id').fill('home_03');
  // Native TablePress validates its ID on blur and asks for confirmation.
  await page.locator('#table-id').press('Tab');
  const records=[EXPECTED,['Tiêu đề','Mô tả','Ảnh nền','Nhãn nút','Liên kết nút'],['Combo bể cubic 40 siêu trong','','','Xem combo','/san-pham/combo-be-cubic-40-sieu-trong/']];
  await page.evaluate(value=>{window.tp.editor.setData(value);window.tp.helpers.unsaved_changes.set()},records);
  let data=await page.evaluate(()=>window.tp.editor.getData());
  assert.deepEqual(data.slice(0,3),records,'table grid differs before saving');
  // Use native Insert Image for the image cell, never insert raw HTML or bare URL.
  await page.evaluate(()=>{window.tp.editor.updateSelectionFromCoords(2,2,2,2);window.tp.callbacks.insert_image.open_dialog();});
  const attachment=page.locator('.media-modal .attachment[data-id="'+mediaId+'"]');
  await attachment.waitFor({state:'visible',timeout:25000});
  await attachment.click();
  const altField=page.locator('.media-modal .attachment-details [data-setting="alt"] input');
  if(await altField.count()) await altField.fill('Combo bể cubic 40 siêu trong');
  const insert=page.locator('.media-modal .media-button-insert');
  await insert.waitFor({state:'visible',timeout:15000});
  await insert.click();
  await page.waitForFunction(()=>typeof window.tp?.editor?.getData()?.[2]?.[2]==='string' && /<img\b/i.test(window.tp.editor.getData()[2][2]),null,{timeout:15000});
  data=await page.evaluate(()=>window.tp.editor.getData());
  // Keep the native Insert Image markup; normalize only the same-origin src to a WordPress-relative path.
  if(data[2][2].includes(BASE+imagePath)){
   await page.evaluate(({absolute,relative})=>{const old=window.tp.editor.getData()[2][2];window.tp.editor.setValueFromCoords(2,2,old.replace(absolute,relative));},{absolute:BASE+imagePath,relative:imagePath});
   data=await page.evaluate(()=>window.tp.editor.getData());
  }
  const imageHtml=data[2][2];
  assert.equal((imageHtml.match(/<img\b/gi)||[]).length,1,'must insert exactly one image tag');
  assert(imageHtml.includes(imagePath),'native image source mismatch');
  assert(/alt=["'][^"']+["']/i.test(imageHtml),'image alt missing');
  console.log('NATIVE_IMAGE_INSERTED='+JSON.stringify({mediaId,hasAlt:true,oneTag:true}));
  await page.getByRole('button',{name:'Save Changes'}).first().click();
  await page.waitForTimeout(2500);
  // The editor's saved URL and model must both identify home_03.
  await page.goto(BASE+EDIT+'home_03',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:20000});
  const verified=await page.evaluate(()=>({id:document.getElementById('table-id')?.value,data:window.tp.editor.getData().slice(0,3)}));
  assert.equal(verified.id,'home_03','native table id not persisted');
  assert.deepEqual(verified.data[0],EXPECTED,'column schema readback mismatch');
  assert.equal(verified.data[2][0],'Combo bể cubic 40 siêu trong','title readback mismatch');
  assert.equal((verified.data[2][2].match(/<img\b/gi)||[]).length,1,'image readback mismatch');
  assert(verified.data[2][2].includes(imagePath),'image source readback mismatch');
  committed=true;
  console.log('HOME03_TABLE_READ_AFTER_WRITE_PASS='+JSON.stringify({id:verified.id,columns:verified.data[0],rows:verified.data.length,mediaId}));
  console.log('NEXT_REQUIRED=Insert Code for home_03 on homepage, then build and Builder QA');
 } catch(e){
  console.error('HOME03_WRITER_FAILED='+e.message);
  if(createdId&&!committed){
   // Rollback uses exclusively the newly-created table ID. Never select another table.
   try{
    await page.goto(BASE+LIST,{waitUntil:'domcontentloaded',timeout:30000});
    const id=(await page.locator('#cb-select-home_03').count())?'home_03':createdId;
    const box=page.locator('#cb-select-'+id);
    if(await box.count()){
     await box.check();
     await page.locator('#bulk-action-selector-top').selectOption({label:'Delete'});
     await page.locator('#doaction').click();
     await page.waitForTimeout(1200);
     await page.goto(BASE+LIST,{waitUntil:'domcontentloaded'});
     assert.equal(await page.locator('#cb-select-'+id).count(),0,'rollback did not remove table');
     console.log('ROLLBACK_NEW_TABLE=PASS');
    }else console.log('ROLLBACK_NEW_TABLE=NOT_FOUND');
   }catch(rollbackError){console.error('ROLLBACK_NEEDS_MANUAL_REVIEW='+rollbackError.message);}
  }
  process.exitCode=1;
 } finally {await browser.close();}
};
browserFlow().catch(e=>{console.error('HOME03_FATAL='+e.message);process.exitCode=1;});
