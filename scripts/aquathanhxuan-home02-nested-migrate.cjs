// One-time, idempotent native migration: Home 02 -> tool_ Product ESC Table.
// Scope: Home 02 ESC Table, a newly created child, and removal of one legacy
// native Insert Code wrapper on WordPress Page 82454. Keep the source table as backup.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const WP='https://admin.aquathanhxuan.io.vn';
const PARENT='home_02', OLD='home_02products', CHILD='tool_home02products', PAGE_ID=82454;
const target='[table id='+OLD+' /]';
const edit=id=>WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+id;
const pageEdit=WP+'/wp-admin/post.php?post='+PAGE_ID+'&action=edit&esc_full_admin=1';
assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD,'Missing WordPress admin secrets');
const eq=(a,b)=>assert.deepEqual(a,b);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();page.setDefaultTimeout(20000);
 page.on('dialog',async d=>{if(d.type()==='beforeunload')await d.accept();else await d.dismiss()});
 let childCreated=false,parentLinked=false,pageUpdated=false;
 try{
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:40000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const read=async id=>{
   const r=await page.request.get(WP+'/wp-json/tablepress/v1/table/'+id+'?t='+Date.now(),{timeout:30000});
   if(r.status()===404)return null;
   assert.equal(r.status(),200,'TablePress REST '+id);
   return r.json();
  };
  const originalSource=await read(OLD), originalParent=await read(PARENT);
  assert(originalSource?.meta?.api==='Product','Legacy Product table missing or changed');
  assert(Array.isArray(originalSource.items),'Legacy Product rows missing');
  assert(originalParent && Array.isArray(originalParent.items),'Home 02 parent table missing');
  assert.equal(originalParent.items.length,1,'Unexpected parent banner row count');
  const selected=originalSource.items.map(row=>String(row?.key||row?.['api-key']||'').trim());
  assert(selected.length>=1 && selected.length<=48,'Unexpected Product selection size');
  assert(selected.every(id=>/^[0-9]+$/.test(id)),'Invalid Product ID');
  assert.equal(new Set(selected).size,selected.length,'Duplicate Product references');
  const oldRows=JSON.stringify(originalSource.items);
  const childBefore=await read(CHILD);
  if(childBefore){
   assert.equal(childBefore.meta?.api,'Product','Existing child table has wrong data source');
   eq(childBefore.items.map(x=>String(x?.key||x?.['api-key']||'').trim()),selected);
   console.log('HOME02_CHILD_ALREADY_PRESENT='+CHILD);
  }else{
   await page.goto(WP+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded'});
   await page.locator('[name="table[name]"]').fill('Nền thủy sinh - sản phẩm');
   await page.locator('[name="table[description]"]').fill('ESC Table con nguồn Product thuộc home_02');
   await page.locator('[name="table[rows]"]').fill(String(selected.length+2));
   await page.locator('[name="table[columns]"]').fill('1');
   await page.getByRole('button',{name:'Add Table'}).click();
   await page.waitForURL(u=>u.searchParams.get('action')==='edit' && Boolean(u.searchParams.get('table_id')),{timeout:45000});
   const generated=new URL(page.url()).searchParams.get('table_id');
   assert(/^[a-zA-Z0-9_-]+$/.test(generated),'Unexpected native temporary ID');
   const html=await page.content();
   const nonce=html.match(/edit_table:\s*'([^']+)'/)?.[1];
   assert(nonce,'Missing native TablePress save nonce');
   const rows=[['key'],['Sản phẩm'],...selected.map(id=>[id])];
   const params=new URLSearchParams();
   for(const [k,v] of [
    ['action','tablepress_save_table'],['_ajax_nonce',nonce],
    ['tablepress[id]',generated],['tablepress[new_id]',CHILD],
    ['tablepress[name]','Nền thủy sinh - sản phẩm'],
    ['tablepress[description]','ESC Table con Product; quản lý qua Visual Builder home_02'],
    ['tablepress[data]',JSON.stringify(rows)],['tablepress[options]','{}'],
    ['tablepress[visibility]',JSON.stringify({rows:rows.map(()=>1),columns:[1]})],
    ['tablepress[number][rows]',String(rows.length)],['tablepress[number][columns]','1'],
    ['custom_api','Product'],['custom_image',''],['custom_cols',''],['custom_rows','']
   ])params.append(k,v);
   const saved=await page.evaluate(async body=>{
    const res=await fetch('/wp-admin/admin-ajax.php',{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body});
    return {status:res.status,result:await res.json()};
   },params.toString());
   assert(saved.status===200&&saved.result?.success===true&&saved.result?.table_id===CHILD,
     'Native Product ESC Table create failed: '+JSON.stringify(saved));
   childCreated=true;
   console.log('HOME02_CHILD_CREATED='+CHILD);
  }
  let child=await read(CHILD);
  assert(child && Array.isArray(child.items),'Child readback absent');
  eq(child.items.map(x=>String(x.key||x['api-key']||'').trim()),selected);
  if(child.meta?.api!=='Product'){
   assert(!child.meta?.api,'Unexpected existing child data source');
   await page.goto(edit(CHILD),{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:25000});
   const before=await page.evaluate(()=>window.tp.editor.getData());
   eq(before.slice(2).map(row=>String(row[0])),selected);
   const selector=page.locator('#js_custom_api_source');
   await selector.waitFor({state:'visible',timeout:12000});
   await selector.selectOption('Product');
   await page.waitForFunction(()=>document.querySelector('#js_custom_api')?.value==='Product',null,{timeout:15000});
   await page.getByRole('button',{name:'Save Changes'}).first().click();
   await page.waitForTimeout(1500);
   child=await read(CHILD);
   assert.equal(child?.meta?.api,'Product','Product selector did not persist');
  }
  eq(child.items.map(x=>String(x.key||x['api-key']||'').trim()),selected);

  await page.goto(edit(PARENT),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:25000});
  const currentGrid=await page.evaluate(()=>window.tp.editor.getData());
  eq(currentGrid[0].slice(0,5),['title','description','image','button_label','button_href']);
  assert.equal(currentGrid.length,3,'Home 02 grid changed unexpectedly');
  const hasColumn=currentGrid[0].indexOf('shortcode-products');
  assert(hasColumn===-1||currentGrid[2][hasColumn]===''||currentGrid[2][hasColumn]===CHILD,
   'Home 02 already references a different child');
  const modifiedGrid=currentGrid.map(row=>[...row]);
  let index=hasColumn;
  if(index===-1){
    index=modifiedGrid[0].length;
    modifiedGrid.forEach(row=>row.push(''));
    modifiedGrid[0][index]='shortcode-products';
    modifiedGrid[1][index]='Danh sách sản phẩm';
  }
  modifiedGrid[2][index]=CHILD;
  if(JSON.stringify(modifiedGrid)!==JSON.stringify(currentGrid)){
   const nonce=(await page.content()).match(/edit_table:\s*'([^']+)'/)?.[1];
   assert(nonce,'Parent edit nonce missing');
   const recheck=await read(PARENT);
   eq(recheck.items,originalParent.items);
   const params=new URLSearchParams();
   for(const [k,v] of [
    ['action','tablepress_save_table'],['_ajax_nonce',nonce],
    ['tablepress[id]',PARENT],['tablepress[new_id]',PARENT],
    ['tablepress[name]',String(recheck.name||'Nền thủy sinh')],
    ['tablepress[description]',String(recheck.description||'')],
    ['tablepress[data]',JSON.stringify(modifiedGrid)],
    ['tablepress[options]',JSON.stringify(recheck.options||{})],
    ['tablepress[visibility]',JSON.stringify({rows:modifiedGrid.map(()=>1),columns:modifiedGrid[0].map(()=>1)})],
    ['tablepress[number][rows]',String(modifiedGrid.length)],
    ['tablepress[number][columns]',String(modifiedGrid[0].length)],
    ['custom_api',String(recheck.meta?.api||'')],
    ['custom_image',''],['custom_cols',''],['custom_rows','']
   ])params.append(k,v);
   const saved=await page.evaluate(async body=>{
    const r=await fetch('/wp-admin/admin-ajax.php',{method:'POST',credentials:'same-origin',
     headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body});
    return {status:r.status,result:await r.json()};
   },params.toString());
   assert(saved.status===200 && saved.result?.success===true && saved.result?.table_id===PARENT,
    'Native parent ESC Table save failed: '+JSON.stringify(saved));
  }
  const parent=await read(PARENT);
  assert.equal(parent?.items?.[0]?.['shortcode-products'],CHILD,'Parent link readback missing');
  for(const key of Object.keys(originalParent.items[0])){
   eq(parent.items[0][key],originalParent.items[0][key]);
  }
  parentLinked=true;
  console.log('HOME02_PARENT_LINK_VERIFIED='+PARENT+' => '+CHILD);

  // Remove just the existing Insert Code wrapper, through the WordPress editor.
  // Do not reauthor any other section or touch other Pages.
  await page.goto(pageEdit,{waitUntil:'domcontentloaded',timeout:45000});
  let original=await page.locator('#content').inputValue();
  const allIds=original.match(/\[table\s+id=[a-zA-Z0-9_-]+\s*\/\]/g)||[];
  assert(allIds.includes('[table id='+PARENT+' /]'),'Native Home 02 Page block missing');
  const count=original.split(target).length-1;
  assert(count===0||count===1,'Multiple legacy Page embeds detected');
  if(count===1){
   const pos=original.indexOf(target);
   const start=original.lastIndexOf('<div',pos);
   const endPos=original.indexOf('</div>',pos);
   assert(start>=0 && endPos>pos,'Native preview wrapper boundaries not found');
   const segment=original.slice(start,endPos+6);
   assert(/^<div\b[^>]*class="[^"]*tablepress-preview-wrap[^"]*"/.test(segment),
     'Legacy shortcode is not inside a native Insert Code wrapper');
   assert(segment.includes('data-table-id="'+OLD+'"')&&segment.includes(target),
     'The wrapper is not an exact legacy Product embed');
   assert((segment.match(/\[table\s+id=/g)||[]).length===1,'Nested unrelated shortcode in target wrapper');
   assert(!segment.slice(4).includes('<div'),'Nested div in native wrapper, unsafe to remove');
   const updated=original.slice(0,start)+original.slice(endPos+6);
   const beforeIds=allIds.filter(x=>x!==target);
   eq(updated.match(/\[table\s+id=[a-zA-Z0-9_-]+\s*\/\]/g)||[],beforeIds);
   await page.locator('#content-html').click();
   await page.waitForFunction(()=>window.tinymce?.get('content')?.isHidden()===true,null,{timeout:20000});
   const baseline=await page.locator('#content').inputValue();
   assert.equal(baseline,original,'Switching WordPress editor modes changed page content');
   await page.locator('#content').fill(updated);
   await page.locator('#publish').click();
   await page.waitForTimeout(1700);
   const verifyContext=await browser.newContext();
   await verifyContext.addCookies(await page.context().cookies());
   const verifyPage=await verifyContext.newPage();
   await verifyPage.goto(pageEdit,{waitUntil:'domcontentloaded',timeout:45000});
   const readback=await verifyPage.locator('#content').inputValue();
   assert.equal(readback,updated,'Page readback differs after removing legacy block');
   await verifyContext.close();
   pageUpdated=true;
   console.log('HOME02_LEGACY_PAGE_EMBED_REMOVED='+OLD);
  }else{
   console.log('HOME02_LEGACY_PAGE_EMBED_ALREADY_REMOVED');
  }
  const sourceAfter=await read(OLD), childAfter=await read(CHILD), parentAfter=await read(PARENT);
  assert.equal(JSON.stringify(sourceAfter?.items),oldRows,'Existing curated Product list was altered');
  eq(childAfter?.items?.map(x=>String(x.key||x['api-key']||'').trim()),selected);
  assert.equal(childAfter?.meta?.api,'Product','Child lost Product API source');
  assert.equal(parentAfter?.items?.[0]?.['shortcode-products'],CHILD,'Parent lost child link');
  console.log('HOME02_NESTED_MIGRATION_PASS='+JSON.stringify({
   parent:PARENT,child:CHILD,selectedIds:selected,count:selected.length,
   legacyEmbedRemoved:true,sourceBackupKept:true,
   childCreated,parentLinked,pageUpdated
  }));
 }catch(error){
  console.error('HOME02_NESTED_MIGRATION_FAIL='+error.stack);
  if(childCreated&&!parentLinked)console.error('RECOVERY_REQUIRED_CHILD_CREATED='+CHILD);
  if(parentLinked&&!pageUpdated)console.error('RECOVERY_REQUIRED_PAGE_CHECK='+PAGE_ID);
  process.exitCode=1;
 }finally{await browser.close()}
})().catch(e=>{console.error('HOME02_NESTED_FATAL='+e.stack);process.exitCode=1});
