// Native ESC Table writer for the two verified equipment promotional cards.
// Only creates home_04; does not edit the homepage, products, or existing tables.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const env = Object.fromEntries((process.env.ENV_FILE || '').split(/\r?\n/)
  .map(s => s.match(/^\s*(WC_URL|WC_URL_CLIENT)\s*=\s*(.*?)\s*$/))
  .filter(Boolean).map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));
assert.equal(env.WC_URL, 'https://admin.aquathanhxuan.io.vn');
assert.equal(env.WC_URL_CLIENT, 'https://aquathanhxuan.io.vn');
assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD, 'WordPress credentials missing');

const base = env.WC_URL;
const tableId = 'home_04';
const expectedHeader = ['title','description','image','button_label','button_href'];
const promos = [
  { title:'Máy lọc', description:'Lọc thùng Sunsun HW-704A',
    productId:82497, mediaId:82496,
    imagePath:'/wp-content/uploads/2026/11/Thiet-ke-chua-co-ten-2024-05-18T221408.130.png',
    href:'/san-pham/sunsun-hw-704a-may-loc-ngoai-cho-ho-ca-canh/' },
  { title:'Đèn', description:'Đèn Led Week T90 pro',
    productId:82479, mediaId:82478,
    imagePath:'/wp-content/uploads/2026/11/Thiet-ke-chua-co-ten-26.png',
    href:'/san-pham/den-week-t90-pro/' }
];
const listUrl = base + '/wp-admin/admin.php?page=tablepress';
const editUrl = base + '/wp-admin/admin.php?page=tablepress&action=edit&table_id=';
const readData = page => page.evaluate(() => window.tp.editor.getData());

(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  const page = await browser.newPage({acceptDownloads:false});
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(45000);
  let createdId = null, verified = false;
  page.on('dialog', async dialog => {
    if (dialog.type()==='beforeunload' || (dialog.type()==='confirm' && /table\s*id/i.test(dialog.message())))
      await dialog.accept();
    else await dialog.dismiss();
  });
  try {
    await page.goto(base+'/wp-login.php',{waitUntil:'domcontentloaded'});
    if (await page.locator('#user_login').count()) {
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
    await page.goto(listUrl,{waitUntil:'domcontentloaded'});
    // A previously created table may not be overwritten or duplicated.
    const exists = await page.locator('#cb-select-'+tableId).count() > 0;

    // Verify real published product/permalink and WordPress-owned Media ID.
    for (const promo of promos) {
      const productResponse = await page.request.get(base+'/wp-json/wc/store/v1/products/'+promo.productId);
      assert.equal(productResponse.status(),200,'product missing '+promo.productId);
      const product = await productResponse.json();
      assert.equal(product.name,promo.description,'real product mismatch');
      assert.equal(new URL(product.permalink).pathname,promo.href,'real product URL mismatch');
      assert((product.images||[]).some(image=>Number(image.id)===promo.mediaId),'product media ownership mismatch');
      const mediaResponse = await page.request.get(base+'/wp-json/wp/v2/media/'+promo.mediaId);
      assert.equal(mediaResponse.status(),200,'WordPress Media ID missing');
      const media = await mediaResponse.json();
      assert.equal(new URL(media.source_url).pathname,promo.imagePath,'WordPress image path mismatch');
      console.log('HOME04_REAL_MEDIA_PASS='+JSON.stringify({productId:promo.productId,mediaId:promo.mediaId,path:promo.imagePath}));
    }

    if (exists) {
      await page.goto(editUrl+tableId,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:20000});
      const saved = await readData(page);
      assert.deepEqual(saved[0],expectedHeader,'existing home_04 differs from intended schema');
      for (const [index,promo] of promos.entries()) {
        const row = saved[index+2];
        assert.equal(row?.[0],promo.title,'existing home_04 title differs');
        assert.equal(row?.[4],promo.href,'existing home_04 CTA differs');
        assert(String(row?.[2]||'').includes(promo.imagePath),'existing home_04 image differs');
      }
      console.log('HOME04_TABLE=PASS_ALREADY_PRESENT');
      verified=true;
      return;
    }

    await page.goto(base+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded'});
    await page.locator('[name="table[name]"]').fill('Máy lọc và Đèn');
    await page.locator('[name="table[description]"]').fill('');
    await page.locator('[name="table[rows]"]').fill('4');
    await page.locator('[name="table[columns]"]').fill('5');
    await page.getByRole('button',{name:'Add Table'}).click();
    await page.waitForURL(url=>url.searchParams.get('action')==='edit' && Boolean(url.searchParams.get('table_id')),{timeout:45000});
    createdId=new URL(page.url()).searchParams.get('table_id');
    assert(/^[a-zA-Z0-9_-]+$/.test(createdId),'invalid temporary table id');
    console.log('HOME04_CREATED_TEMP_TABLE='+createdId);
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.setData),null,{timeout:20000});
    await page.locator('#table-id').fill(tableId);
    await page.locator('#table-id').press('Tab'); // Accept native rename confirmation.
    const rows=[expectedHeader,['Tiêu đề','Sản phẩm','Hình ảnh','Nhãn nút','Liên kết']];
    for (const promo of promos) rows.push([promo.title,promo.description,'','Xem sản phẩm',promo.href]);
    await page.evaluate(value=>{window.tp.editor.setData(value);window.tp.helpers.unsaved_changes.set();},rows);
    assert.deepEqual((await readData(page)).slice(0,4),rows,'native editor data mismatch before image');

    for (const [index,promo] of promos.entries()) {
      const nativeRow=index+2; // header and label row precede items.
      await page.evaluate(row=>{
        window.tp.editor.updateSelectionFromCoords(2,row,2,row);
        window.tp.callbacks.insert_image.open_dialog();
      },nativeRow);
      const attachment=page.locator('.media-modal .attachment[data-id="'+promo.mediaId+'"]');
      await attachment.waitFor({state:'visible',timeout:28000});
      await attachment.click();
      const alt=page.locator('.media-modal .attachment-details [data-setting="alt"] input');
      if(await alt.count()) await alt.fill(promo.description);
      await page.locator('.media-modal .media-button-insert').click();
      await page.waitForFunction(row=>typeof window.tp?.editor?.getData()?.[row]?.[2]==='string'
        && /<img\b/i.test(window.tp.editor.getData()[row][2]),nativeRow,{timeout:20000});
      let raw=(await readData(page))[nativeRow][2];
      if(raw.includes(base+promo.imagePath)){
        await page.evaluate(({row,absolute,relative})=>{
          const current=window.tp.editor.getData()[row][2];
          window.tp.editor.setValueFromCoords(2,row,current.replace(absolute,relative));
        },{row:nativeRow,absolute:base+promo.imagePath,relative:promo.imagePath});
        raw=(await readData(page))[nativeRow][2];
      }
      assert.equal((raw.match(/<img\b/gi)||[]).length,1,'expected exactly one native IMG per cell');
      assert(raw.includes(promo.imagePath),'native image path mismatch');
      assert(/alt=["'][^"']+["']/i.test(raw),'native SEO alt missing');
      console.log('HOME04_NATIVE_IMAGE_PASS='+JSON.stringify({nativeRow,mediaId:promo.mediaId}));
    }

    await page.getByRole('button',{name:'Save Changes'}).first().click();
    await page.waitForTimeout(2500);
    await page.goto(editUrl+tableId,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:20000});
    const saved=await page.evaluate(()=>({id:document.getElementById('table-id')?.value,rows:window.tp.editor.getData()}));
    assert.equal(saved.id,tableId,'native table ID not persisted');
    assert.deepEqual(saved.rows[0],expectedHeader,'saved columns differ');
    assert.equal(saved.rows.length,4,'saved item count mismatch');
    for(const [index,promo] of promos.entries()) {
      const row=saved.rows[index+2];
      assert.equal(row[0],promo.title);
      assert.equal(row[1],promo.description);
      assert.equal(row[3],'Xem sản phẩm');
      assert.equal(row[4],promo.href);
      assert.equal((row[2].match(/<img\b/gi)||[]).length,1);
      assert(row[2].includes(promo.imagePath));
    }
    verified=true;
    console.log('HOME04_NATIVE_TABLE=PASS table=home_04 rows=2 native_images=2');
  } catch(error) {
    console.error('HOME04_NATIVE_TABLE=FAIL '+error.message);
    if(createdId && !verified) {
      try {
        await page.goto(listUrl,{waitUntil:'domcontentloaded',timeout:30000});
        const id=await page.locator('#cb-select-home_04').count()?'home_04':createdId;
        const checkbox=page.locator('#cb-select-'+id);
        if(await checkbox.count()){
          await checkbox.check();
          await page.locator('#bulk-action-selector-top').selectOption({label:'Delete'});
          await page.locator('#doaction').click();
          await page.goto(listUrl,{waitUntil:'domcontentloaded'});
          assert.equal(await page.locator('#cb-select-'+id).count(),0,'cleanup verification failed');
          console.log('HOME04_ROLLBACK_TEMP=PASS id='+id);
        }
      } catch(cleanupError) {
        console.error('HOME04_ROLLBACK_TEMP=FAIL '+cleanupError.message);
      }
    }
    process.exitCode=1;
  } finally { await browser.close(); }
})().catch(error=>{console.error('HOME04_FATAL='+error.message);process.exitCode=1;});
