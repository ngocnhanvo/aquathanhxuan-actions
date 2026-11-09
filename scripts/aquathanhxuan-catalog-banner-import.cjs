'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const WP='https://admin.aquathanhxuan.io.vn';
const tableId='catalog_banner';
const pageId=82457;
const bannerDefs=[
 {url:'https://aquathanhxuan.com/wp-content/uploads/2024/05/cropped-1-2.png',name:'cropped-1-2.png',alt:'Banner danh mục sản phẩm Aqua Thanh Xuân'},
 {url:'https://aquathanhxuan.com/wp-content/uploads/2024/05/cropped-4-2.png',name:'cropped-4-2.png',alt:'Banner giới thiệu thiết bị thủy sinh Aqua Thanh Xuân'},
];
const output='artifacts/category-banner';
fs.mkdirSync(output,{recursive:true});
const journal={status:'STARTED',writeScope:['media:cropped-1-2.png','media:cropped-4-2.png','tablepress:catalog_banner','page:82457'],media:[],tableChanged:false,pageChanged:false};
const save=()=>fs.writeFileSync(output+'/result.json',JSON.stringify(journal,null,2)+'\n');
const tableEditor=WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+tableId;
const records=[['image','link'],['Ảnh banner','Liên kết'],['',''],['','']];
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function sourceImage(url){
 let last;
 for(let attempt=1;attempt<=4;attempt++){
  try{
   const res=await fetch(url,{signal:AbortSignal.timeout(20000)});
   if(!res.ok)throw Error('HTTP '+res.status);
   const bytes=Buffer.from(await res.arrayBuffer());
   assert(bytes.length>1000 && bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'Not a valid PNG');
   return {bytes,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  }catch(e){last=e;if(attempt<4)await sleep(500*attempt)}
 }
 throw Error('ASSET_DEFERRED '+url+' '+String(last));
}
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing CMS secrets');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 page.setDefaultTimeout(20000);
 page.on('dialog',async d=>{if(d.type()==='confirm'||d.type()==='beforeunload')await d.accept();else await d.dismiss()});
 try{
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nonceRes=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceRes.status(),200,'WP REST nonce unavailable');
  const nonce=(await nonceRes.text()).trim();
  assert(nonce && nonce!=='-1','WP nonce invalid');
  const headers={'X-WP-Nonce':nonce,Accept:'application/json','Cache-Control':'no-cache'};
  const get=async url=>{const res=await page.request.get(WP+url,{headers,timeout:30000});if(!res.ok())throw Error(url+' HTTP '+res.status());return res.json()};
  // Check existing Page before any CMS mutation.
  const originalPage=await get('/wp-json/wp/v2/pages/'+pageId+'?context=edit');
  assert.equal(originalPage.slug,'san-pham','Unexpected Page identity');
  assert.equal(originalPage.acf?.key,'ssr-products','Unexpected Page ACF key');
  assert.equal(originalPage.acf?.action,'ProductsSSRPage','Unexpected Page Action');
  const originalContent=String(originalPage.content?.raw || '');
  assert(originalContent.length<30000,'Unknown oversized Page body; refuse automatic mutation');
  journal.originalPageContentLength=originalContent.length;
  console.log('CATALOG_PAGE_PREFLIGHT_PASS='+JSON.stringify({id:pageId,key:originalPage.acf.key,contentLength:originalContent.length,alreadyEmbedded:originalContent.includes('catalog_banner')}));
  for(const def of bannerDefs){
   const mediaList=await get('/wp-json/wp/v2/media?context=edit&per_page=100&search='+encodeURIComponent(def.name.replace('.png','')));
   let matching=mediaList.filter(media=>new URL(media.source_url||'',WP).pathname.endsWith('/'+def.name));
   assert(matching.length<=1,'Ambiguous media filename '+def.name);
   let media=matching[0],created=false;
   if(!media){
     const {bytes,sha256}=await sourceImage(def.url);
     const upload=await page.request.post(WP+'/wp-json/wp/v2/media',{headers:{...headers,'Content-Disposition':'attachment; filename="'+def.name+'"'},multipart:{file:{name:def.name,mimeType:'image/png',buffer:bytes}},timeout:60000});
     const text=await upload.text();
     if(!upload.ok())throw Error('Media upload '+def.name+' HTTP '+upload.status()+' '+text.slice(0,150));
     media=JSON.parse(text);created=true;
     console.log('CATALOG_MEDIA_IMPORTED='+JSON.stringify({id:media.id,filename:def.name,sha256,size:bytes.length}));
   }
   assert(Number.isSafeInteger(media.id),'Invalid media ID '+def.name);
   const mediaPath=new URL(media.source_url,WP).pathname;
   assert(mediaPath.startsWith('/wp-content/uploads/') && mediaPath.endsWith('/'+def.name),'Media path mismatch '+def.name);
   if(String(media.alt_text||'')!==def.alt){
     const update=await page.request.post(WP+'/wp-json/wp/v2/media/'+media.id,{headers,data:{alt_text:def.alt},timeout:30000});
     assert.equal(update.status(),200,'Cannot save ALT on '+def.name);
   }
   journal.media.push({id:media.id,filename:def.name,path:mediaPath,created});save();
  }
  const priorTableRes=await page.request.get(WP+'/wp-json/tablepress/v1/table/'+tableId,{headers,timeout:30000});
  if(priorTableRes.status()===404){
    // Resume the table allocated by the previous failed run. Never allocate a second table.
    const recovery=await page.request.get(WP+'/wp-json/tablepress/v1/table/157',{headers,timeout:30000});
    if(recovery.status()===200){
      await page.goto(WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id=157',{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:30000});
      const old=await page.evaluate(()=>window.tp.editor.getData());
      assert.deepEqual(old.slice(0,2),records.slice(0,2),'Recovery Table 157 unexpected schema');
      assert.equal(old.length,4,'Recovery Table 157 unexpected rows');
      await page.locator('#table-id').fill(tableId);
      await page.locator('#table-id').press('Tab');
      console.log('CATALOG_TABLE_RECOVERING=157');
    }else if(recovery.status()===404){
    await page.goto(WP+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded',timeout:45000});
    await page.locator('[name="table[name]"]').fill('Banner danh mục sản phẩm');
    await page.locator('[name="table[description]"]').fill('Hai banner danh mục từ website gốc — quản lý bằng ESC Table / Visual Builder.');
    await page.locator('[name="table[rows]"]').fill('4');
    await page.locator('[name="table[columns]"]').fill('2');
    await page.getByRole('button',{name:'Add Table'}).click();
    await page.waitForURL(u=>u.searchParams.get('action')==='edit'&&u.searchParams.has('table_id'),{timeout:30000});
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.setData),null,{timeout:30000});
    await page.locator('#table-id').fill(tableId);
    await page.locator('#table-id').press('Tab');
    await page.evaluate(rows=>{window.tp.editor.setData(rows);window.tp.helpers.unsaved_changes.set()},records);
    console.log('CATALOG_TABLE_CREATED_ID='+new URL(page.url()).searchParams.get('table_id'));
    }else throw Error('Recovery table 157 unexpected status '+recovery.status());
  }else{
    assert.equal(priorTableRes.status(),200,'Table API status unexpected '+priorTableRes.status());
    await page.goto(tableEditor,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:30000});
    const old=await page.evaluate(()=>window.tp.editor.getData());
    assert.deepEqual(old.slice(0,2),records.slice(0,2),'Existing Table schema mismatch');
    assert.equal(old.length,4,'Existing Table row count unexpected');
  }
  let grid=await page.evaluate(()=>window.tp.editor.getData());
  for(let i=0;i<2;i++){
    const def=bannerDefs[i],media=journal.media[i],row=i+2;
    if(String(grid[row]?.[0]||'').includes(media.path)){continue;}
    assert(!String(grid[row]?.[0]||'').trim(),'Refuse to overwrite unrecognized banner image');
    await page.evaluate(({row})=>{window.tp.editor.updateSelectionFromCoords(0,row,0,row);window.tp.callbacks.insert_image.open_dialog()},{row});
    const item=page.locator('.media-modal .attachment[data-id="'+media.id+'"]');
    await item.waitFor({state:'visible',timeout:30000});
    await item.click();
    const altInput=page.locator('.media-modal .attachment-details [data-setting="alt"] input');
    if(await altInput.count())await altInput.fill(def.alt);
    await page.locator('.media-modal .media-button-insert').click();
    await page.waitForFunction(row=>window.tp.editor.getData().some((r,i)=>i>1&&r.some(v=>/<img\\b/i.test(String(v||'')))),row,{timeout:15000}).catch(async e=>{
      console.log('CATALOG_INSERT_DIAGNOSTIC='+JSON.stringify({row,grid:await page.evaluate(()=>window.tp.editor.getData())}));
      throw e;
    });
    grid=await page.evaluate(()=>window.tp.editor.getData());
    let value=String(grid[row][0]||'');
    assert.equal((value.match(/<img\b/gi)||[]).length,1,'One inserted image per row');
    if(value.includes(WP+media.path)){
      value=value.replaceAll(WP+media.path,media.path);
      await page.evaluate(({row,value})=>window.tp.editor.setValueFromCoords(row,0,value),{row,value});
    }
    journal.tableChanged=true;save();
  }
  if(journal.tableChanged || priorTableRes.status()===404){
    await page.getByRole('button',{name:'Save Changes'}).first().click();
    await sleep(1800);
  }
  await page.goto(tableEditor,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:25000});
  grid=await page.evaluate(()=>window.tp.editor.getData());
  assert.deepEqual(grid.slice(0,2),records.slice(0,2),'Native Table saved schema differs');
  for(let i=0;i<2;i++){
    assert(String(grid[i+2][0]||'').includes(journal.media[i].path),'Banner image absent after Table save');
    assert.equal((String(grid[i+2][0]).match(/<img\b/gi)||[]).length,1,'Invalid image cells');
  }
  console.log('CATALOG_TABLE_PASS='+JSON.stringify({id:tableId,media:journal.media.map(x=>x.path),rows:grid.length}));
  if(!originalContent.includes('[table id='+tableId+' /]')){
    await page.goto(WP+'/wp-admin/post.php?post='+pageId+'&action=edit&esc_full_admin=1',{waitUntil:'domcontentloaded',timeout:45000});
    await page.evaluate(()=>{
      const tiny=window.tinymce?.get('content');
      if(tiny&&!tiny.isHidden())tiny.hide();
      const wrap=document.querySelector('#wp-content-wrap');
      if(!wrap)throw Error('Missing editor wrapper');
      wrap.classList.remove('tmce-active');wrap.classList.add('html-active');
      const ta=document.querySelector('#content');
      if(!(ta instanceof HTMLTextAreaElement))throw Error('Missing WordPress textarea');
      ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
      window.wpActiveEditor='content';
    });
    const before=await page.locator('#content').inputValue();
    assert.equal(before,originalContent,'Page content changed after preflight — abort');
    await page.locator('#qt_content_tablepress_quicktags_button').evaluate(el=>el.click());
    const shortcode='[table id='+tableId+' /]';
    const picker=page.frameLocator('#TB_iframeContent').locator('input.insert-shortcode[title="'+shortcode+'"]');
    await picker.waitFor({state:'visible',timeout:20000});
    await picker.click();
    await page.waitForFunction(token=>document.querySelector('#content')?.value.includes(token),shortcode,{timeout:15000});
    const after=await page.locator('#content').inputValue();
    assert(after.startsWith(before),'Original Page content was not preserved');
    assert.equal((after.match(/\[table id=catalog_banner\s*\/\]/g)||[]).length,1,'Duplicate shortcode');
    const publish=page.locator('#publish');
    await publish.click();
    await page.waitForTimeout(2200);
    journal.pageChanged=true;save();
  }
  const finalPage=await get('/wp-json/wp/v2/pages/'+pageId+'?context=edit&_esc_check='+Date.now());
  assert.equal(finalPage.slug,'san-pham');
  assert(String(finalPage.content?.raw||'').includes('[table id='+tableId+' /]'),'Native Table shortcode not saved in Page');
  journal.status='PASS';journal.finishedAt=new Date().toISOString();save();
  console.log('CATALOG_CMS_PASS='+JSON.stringify({pageId,tableId,media:journal.media.map(x=>x.id),pageChanged:journal.pageChanged,tableChanged:journal.tableChanged}));
 }catch(e){
   journal.status='FAIL';journal.error=String(e.stack||e);save();
   console.error('CATALOG_CMS_FAIL='+journal.error);
   process.exitCode=1;
 }finally{await browser.close()}
})();
