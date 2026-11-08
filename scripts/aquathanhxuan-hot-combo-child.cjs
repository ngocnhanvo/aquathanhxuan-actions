// Import only verified legacy Hot Combo constituent products into one native
// Product ESC Table, linked by the existing shortcode-* parent-child contract.
// Idempotent: refuse drift; never rewrite unrelated products or pages.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE='https://admin.aquathanhxuan.io.vn';
const PARENT='home_03', CHILD='tool_combo01';
const NAMES=[
 'LED rọi Kaokui KK-F06',
 'Chân gỗ 40x40x70',
 'Bể cubic 40 siêu trong',
 'Máy Lọc Treo Xiaoli Sunsun XBL 500',
];
const norm=s=>String(s||'').normalize('NFC').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().toLocaleLowerCase('vi');
const editing=id=>BASE+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+id;
const url=p=>BASE+p;
assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WordPress login');
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();page.setDefaultTimeout(20000);
 page.on('dialog',async d=>{
   if(d.type()==='beforeunload'||(d.type()==='confirm'&&/table\s*id/i.test(d.message())))await d.accept();
   else await d.dismiss();
 });
 let newChild=false,parentSaved=false;
 try{
  await page.goto(url('/wp-login.php'),{waitUntil:'domcontentloaded',timeout:35000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:40000});
  const matched=[];
  for(const name of NAMES){
   const fragments=[name.split(/\s+/).slice(0,3).join(' '),name.split(/\s+/).slice(-3).join(' ')];
   let found=[];
   for(const q of fragments){
    const res=await page.request.get(url('/wp-json/wc/store/v1/products?per_page=100&search='+encodeURIComponent(q)));
    assert.equal(res.status(),200,'Cannot read WooCommerce product catalogue');
    found=(await res.json()).filter(x=>norm(x.name)===norm(name));
    assert(found.length<=1,'Ambiguous exact Product: '+name);
    if(found.length)break;
   }
   assert.equal(found.length,1,'Missing actual published WooCommerce Product: '+name);
   assert(Number.isSafeInteger(Number(found[0].id))&&Number(found[0].id)>0,'Invalid product ID');
   matched.push({id:String(found[0].id),name:found[0].name});
  }
  assert.equal(new Set(matched.map(x=>x.id)).size,4,'Duplicate WooCommerce references');
  console.log('COMBO_PRODUCTS_REAL='+JSON.stringify(matched));
  const read=async id=>{
   const r=await page.request.get(url('/wp-json/tablepress/v1/table/'+id+'?ts='+Date.now()));
   if(r.status()===404)return null;
   assert.equal(r.status(),200,'Failed to inspect existing table: '+id);
   return r.json();
  };
  const oldParent=await read(PARENT);
  assert(oldParent&&Array.isArray(oldParent.items),'Native Hot Combo parent missing');
  const source=await read(CHILD);
  if(source){
   assert(['','Product'].includes(String(source.meta?.api||'')),'Existing child has a different API source');
   const actual=source.items.map(i=>String(i.key||i['api-key']||'')).filter(Boolean);
   assert.deepEqual(actual,matched.map(x=>x.id),'Child Product list already curated differently; refuse overwrite');
   console.log('COMBO_CHILD_EXISTING=PASS');
  }
  // Refuse unexpected parent schema or multiple edited rows: keep all other CMS changes untouched.
  await page.goto(editing(PARENT),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:25000});
  const parentData=await page.evaluate(()=>window.tp.editor.getData());
  assert.deepEqual(parentData[0].slice(0,5),['title','description','image','button_label','button_href'],'Home_03 column schema drift');
  assert.equal(parentData.length,3,'Expected only one existing combo row');
  assert(!parentData[0].includes('shortcode-products')||parentData[2][parentData[0].indexOf('shortcode-products')]===CHILD,'Combo row points to another table');
  const attach=()=> {
    const copy=parentData.map(row=>[...row]);
    let index=copy[0].indexOf('shortcode-products');
    if(index===-1){index=copy[0].length;copy.forEach(row=>row.push(''));copy[0][index]='shortcode-products';copy[1][index]='Sản phẩm thuộc combo';}
    copy[2][index]=CHILD;
    return copy;
  };
  const linked=attach();
  if(!source){
   await page.goto(url('/wp-admin/admin.php?page=tablepress_add'),{waitUntil:'domcontentloaded'});
   await page.locator('[name="table[name]"]').fill('Hot Combo - sản phẩm thành phần');
   await page.locator('[name="table[description]"]').fill('Bảng con nguồn Product của home_03; thêm/xóa/sắp xếp trên Visual Builder');
   await page.locator('[name="table[rows]"]').fill(String(matched.length+2));
   await page.locator('[name="table[columns]"]').fill('1');
   await page.getByRole('button',{name:'Add Table'}).click();
   await page.waitForURL(u=>u.searchParams.get('action')==='edit'&&Boolean(u.searchParams.get('table_id')),{timeout:45000});
   const generated=new URL(page.url()).searchParams.get('table_id');
   assert(/^[A-Za-z0-9_-]+$/.test(generated),'Unexpected TablePress temp ID');
   const body=await page.content();
   const nonce=body.match(/edit_table:\s*'([^']+)'/)?.[1];
   assert(nonce,'Missing native table save nonce');
   const grid=[['key'],['Sản phẩm'],...matched.map(x=>[x.id])];
   const params=new URLSearchParams();
   for(const [k,v] of [
      ['action','tablepress_save_table'],['_ajax_nonce',nonce],
      ['tablepress[id]',generated],['tablepress[new_id]',CHILD],
      ['tablepress[name]','Hot Combo - sản phẩm thành phần'],
      ['tablepress[description]','Product references from original aquathanhxuan.com Hot Combo'],
      ['tablepress[data]',JSON.stringify(grid)],['tablepress[options]','{}'],
      ['tablepress[visibility]',JSON.stringify({rows:grid.map(()=>1),columns:[1]})],
      ['tablepress[number][rows]',String(grid.length)],['tablepress[number][columns]','1'],
      ['custom_api','Product'],['custom_image',''],['custom_cols',''],['custom_rows','']
   ])params.append(k,v);
   const saved=await page.evaluate(async body=>{
     const r=await fetch('/wp-admin/admin-ajax.php',{method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body});
     return {status:r.status,result:await r.json()};
   },params.toString());
   assert(saved.status===200&&saved.result.success&&saved.result.table_id===CHILD,'Failed to create child: '+JSON.stringify(saved));
   newChild=true;
   const created=await read(CHILD);
   assert(created && Array.isArray(created.items),'Child table readback failed');
   assert.deepEqual(created.items.map(x=>String(x.key)),matched.map(x=>x.id),'Child row readback differs');
   console.log('COMBO_CHILD_VERIFIED='+CHILD);
  }
  // Use the native ESC Table API selector: the generic AJAX create save may
  // persist the data grid without persisting the Product data-source metadata.
  const latestChild=await read(CHILD);
  if(latestChild?.meta?.api!=='Product'){
    assert(['',undefined,null].includes(latestChild?.meta?.api),'Refuse an unrelated source type');
    await page.goto(editing(CHILD),{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:25000});
    const unchangedRows=await page.evaluate(()=>window.tp.editor.getData());
    assert.deepEqual(unchangedRows.slice(2).map(row=>String(row[0])),matched.map(x=>x.id),'Child Product rows unexpectedly changed');
    const selector=page.locator('#js_custom_api_source');
    await selector.waitFor({state:'visible',timeout:15000});
    await selector.selectOption('Product');
    await page.waitForFunction(()=>document.querySelector('#js_custom_api')?.value==='Product',null,{timeout:12000});
    await page.getByRole('button',{name:'Save Changes'}).first().click();
    await page.waitForTimeout(1800);
    const updatedChild=await read(CHILD);
    assert.equal(updatedChild?.meta?.api,'Product','Native API selector did not persist');
    assert.deepEqual(updatedChild.items.map(x=>String(x.key)),matched.map(x=>x.id),'Native source update changed child Product IDs');
    console.log('COMBO_CHILD_PRODUCT_API_VERIFIED='+CHILD);
  }
  if(JSON.stringify(linked)!==JSON.stringify(parentData)){
   await page.goto(editing(PARENT),{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>Boolean(window.tp?.editor?.setData),null,{timeout:25000});
   const current=await page.evaluate(()=>window.tp.editor.getData());
   assert.deepEqual(current,parentData,'Concurrent Home_03 edit detected');
   // Native TablePress save must declare both the added grid column and
   // visibility dimension. Merely setData() does not update the editor's
   // internal declared column count and silently truncates the new field.
   const nonce=(await page.content()).match(/edit_table:\s*'([^']+)'/)?.[1];
   assert(nonce,'Missing native edit table nonce');
   const params=new URLSearchParams();
   const originalOptions=oldParent.options && typeof oldParent.options==='object' ? oldParent.options : {};
   const fields=[
     ['action','tablepress_save_table'],['_ajax_nonce',nonce],
     ['tablepress[id]',PARENT],['tablepress[new_id]',PARENT],
     ['tablepress[name]',String(oldParent.name || 'Hot combo')],
     ['tablepress[description]',String(oldParent.description || '')],
     ['tablepress[data]',JSON.stringify(linked)],
     ['tablepress[options]',JSON.stringify(originalOptions)],
     ['tablepress[visibility]',JSON.stringify({rows:linked.map(()=>1),columns:linked[0].map(()=>1)})],
     ['tablepress[number][rows]',String(linked.length)],
     ['tablepress[number][columns]',String(linked[0].length)],
     ['custom_api',String(oldParent.meta?.api || '')],
     ['custom_image',''],['custom_cols',''],['custom_rows','']
   ];
   for(const [k,v] of fields)params.append(k,v);
   const saved=await page.evaluate(async body=>{
     const response=await fetch('/wp-admin/admin-ajax.php',{
       method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body
     });
     return {status:response.status,result:await response.json()};
   },params.toString());
   assert(saved.status===200 && saved.result.success && saved.result.table_id===PARENT,
     'Native parent TablePress save failed '+JSON.stringify(saved));
   const verify=await page.request.get(url('/wp-json/tablepress/v1/table/'+PARENT+'?ts='+Date.now()));
   assert.equal(verify.status(),200,'Parent readback failed');
   const result=await verify.json();
   assert.equal(result.items[0]['shortcode-products'],CHILD,'Missing persisted child reference');
   parentSaved=true;
   console.log('COMBO_PARENT_LINK_VERIFIED='+PARENT+' => '+CHILD);
  }else{parentSaved=true;console.log('COMBO_PARENT_LINK_ALREADY_PRESENT');}
  console.log('HOT_COMBO_CMS_PASS='+JSON.stringify({parent:PARENT,child:CHILD,products:matched}));
 }catch(e){
   console.error('HOT_COMBO_CMS_FAILED='+e.stack);
   // Do not automatically delete any existing tables or other data.
   if(newChild&&!parentSaved)console.error('RECOVERY_REQUIRED_NEW_CHILD='+CHILD);
   process.exitCode=1;
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1});
