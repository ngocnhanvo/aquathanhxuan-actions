// Create exactly one curated Product ESC Table using real, verified products.
// Legacy names are discovery criteria only, never product records or price sources.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const ORIGIN='https://admin.aquathanhxuan.io.vn';
const ID='home_02products';
const PAGE_ID=82454;
const legacyNames=[
'Đèn Led UFO BAO YOU WRGB',
'Đèn A60-80W ZAQUA',
'ĐÈN KAOKUI 70W PRO',
'Đèn COCO FA Series 100w',
'Đèn thủy sinh Neo Helios Flat Nano S3 Pro 13W',
'Đèn Rọi Coco Spotlight SD300 5W',
'Đèn Rọi Coco Spotlight SD300 7W',
'Phân nền cao cấp Prodibio Aqua Growth Soil 9L',
'Cốt nền cao cấp Prodibio Aqua Terra 6L',
'Cốt nền cao cấp Prodibio Aqua Terra 3L'
];
const normalize=s=>String(s||'').normalize('NFC').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().toLocaleLowerCase('vi');
assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WordPress secrets not configured');
const run=async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 page.setDefaultTimeout(20000);
 let created=null,completed=false;
 page.on('dialog',async d=>{
   if(d.type()==='beforeunload'||(d.type()==='confirm'&&/table\s*id/i.test(d.message())))await d.accept();
   else await d.dismiss();
 });
 const url=p=>ORIGIN+p;
 try {
  await page.goto(url('/wp-login.php'),{waitUntil:'domcontentloaded'});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  // WordPress REST nonce is exposed on the authenticated Page editor,
  // not reliably on the generic /wp-admin/ dashboard.
  await page.goto(url('/wp-admin/post.php?post=82454&action=edit&esc_full_admin=1'),
    {waitUntil:'domcontentloaded',timeout:45000});
  const html=await page.content();
  let nonce='';
  const match=html.match(/wpApiSettings\\s*=\\s*(\\{.*?\\})\\s*;/s);
  if(match){try{nonce=JSON.parse(match[1]).nonce||''}catch{}}
  if(!nonce)nonce=html.match(/"nonce"\\s*:\\s*"([A-Za-z0-9]+)"/)?.[1]||'';
  assert(nonce,'Cannot verify WordPress REST nonce');
  const matched=[], missing=[];
  for(const name of legacyNames){
   let found=null;
   const words=name.split(/\s+/);
   const queries=[words.slice(0,4).join(' '),words.slice(-3).join(' ')];
   for(const term of queries){
    const result=await page.request.get(url('/wp-json/wc/store/v1/products?per_page=100&search='+encodeURIComponent(term)),{timeout:25000});
    assert.equal(result.status(),200,'Cannot query actual WooCommerce products');
    const records=await result.json();
    assert(Array.isArray(records),'Invalid WooCommerce Store response');
    const matches=records.filter(p=>normalize(p.name)===normalize(name));
    assert(matches.length<=1,'Ambiguous WooCommerce exact title: '+name);
    if(matches.length===1){found=matches[0];break;}
   }
   if(!found){missing.push(name);continue;}
   assert(Number.isInteger(Number(found.id))&&Number(found.id)>0,'Invalid WooCommerce ID');
   // Product language must be backed by its own WordPress record.
   const detail=await page.request.get(url('/wp-json/wp/v2/product/'+found.id+'?context=edit'),{headers:{'X-WP-Nonce':nonce},timeout:25000});
   assert.equal(detail.status(),200,'Cannot verify WP product record '+found.id);
   const raw=await detail.json();
   assert.equal(String(raw.status),'publish','Nonpublished product: '+name);
   assert.equal(normalize(raw.title?.raw||raw.title?.rendered),normalize(name),'Wrong product identity: '+name);
   assert.equal(String(raw.acf?.product_lang?.value||raw.acf?.product_lang||''),'vi','Missing or wrong product_lang for '+name);
   matched.push({id:String(found.id),name});
  }
  console.log('HOME02PRODUCTS_SOURCE_MATCH='+JSON.stringify({matched,missing}));
  assert.equal(matched.length,legacyNames.length,'Missing verified products; refusing incomplete table');
  const rows=[['key'],['Sản phẩm'],...matched.map(item=>[item.id])];
  const tableURL=url('/wp-admin/admin.php?page=tablepress&action=edit&table_id='+ID);
  const tablePublic=await page.request.get(url('/wp-json/tablepress/v1/table/'+ID));
  if(tablePublic.status()===200){
   const existing=await tablePublic.json();
   assert.equal(existing.meta?.api,'Product','Existing ESC Table has wrong source');
   const actual=(existing.items||[]).map(x=>String(x.key||'')).filter(Boolean);
   assert.deepEqual(actual,matched.map(x=>x.id),'Existing table differs; do not overwrite curated changes');
   console.log('HOME02PRODUCTS_TABLE=ALREADY_PRESENT');
  }else{
   assert.equal(tablePublic.status(),404,'Unexpected TablePress lookup response');
   await page.goto(url('/wp-admin/admin.php?page=tablepress_add'),{waitUntil:'domcontentloaded'});
   await page.locator('[name="table[name]"]').fill('Trang chủ - sản phẩm khu vực Nền');
   await page.locator('[name="table[description]"]').fill('Sản phẩm chọn thủ công, độc lập danh mục sidebar');
   await page.locator('[name="table[rows]"]').fill(String(rows.length));
   await page.locator('[name="table[columns]"]').fill('1');
   await page.getByRole('button',{name:'Add Table'}).click();
   await page.waitForURL(u=>u.searchParams.get('action')==='edit'&&Boolean(u.searchParams.get('table_id')),{timeout:45000});
   created=new URL(page.url()).searchParams.get('table_id');
   assert(/^[A-Za-z0-9_-]+$/.test(created),'Invalid new table ID');
   const editPage=await page.content();
   const nonce=editPage.match(/edit_table:\s*'([^']+)'/)?.[1];
   assert(nonce,'Missing native edit nonce');
   const params=new URLSearchParams();
   for(const [k,v] of [
     ['action','tablepress_save_table'],['_ajax_nonce',nonce],
     ['tablepress[id]',created],['tablepress[new_id]',ID],
     ['tablepress[name]','Trang chủ - sản phẩm khu vực Nền'],
     ['tablepress[description]','Sản phẩm chọn thủ công, độc lập danh mục sidebar'],
     ['tablepress[data]',JSON.stringify(rows)],
     ['tablepress[options]','{}'],
     ['tablepress[visibility]',JSON.stringify({rows:rows.map(()=>1),columns:[1]})],
     ['tablepress[number][rows]',String(rows.length)],
     ['tablepress[number][columns]','1'],['custom_api','Product'],
     ['custom_image',''],['custom_cols',''],['custom_rows','']
   ]) params.append(k,v);
   const saved=await page.evaluate(async form=>{
     const response=await fetch('/wp-admin/admin-ajax.php',{method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:form});
     return {status:response.status,body:await response.json()};
   },params.toString());
   assert.equal(saved.status,200,'Native TablePress save HTTP failed');
   assert(saved.body.success&&saved.body.table_id===ID,'Native ESC Table save failed '+JSON.stringify(saved.body));
  }
  const verify=await page.request.get(url('/wp-json/tablepress/v1/table/'+ID+'?ts='+Date.now()));
  assert.equal(verify.status(),200,'Cannot read persisted ESC Table');
  const table=await verify.json();
  assert.equal(table.meta?.api,'Product','Persisted Product API not set');
  assert.deepEqual((table.items||[]).map(x=>String(x.key||'')).filter(Boolean),matched.map(x=>x.id));
  console.log('HOME02PRODUCTS_TABLE_VERIFIED='+matched.length);
  // Native Insert Code on the real homepage: not a raw shortcode injection.
  const editUrl=url('/wp-admin/post.php?post='+PAGE_ID+'&action=edit&esc_full_admin=1');
  await page.goto(editUrl,{waitUntil:'domcontentloaded'});
  const original=await page.locator('#content').inputValue();
  assert(original.includes('[table id=home_02 /]'),'Homepage structure changed; refuse page modification');
  const shortcode='[table id='+ID+' /]';
  if(!original.includes(shortcode)){
   await page.locator('#content-html').click();
   await page.waitForFunction(()=>window.tinymce?.get('content')?.isHidden()===true,null,{timeout:20000});
   const insertButton=page.locator('#qt_content_tablepress_quicktags_button');
   await insertButton.waitFor({state:'visible',timeout:15000});
   await page.evaluate(()=>{const el=document.getElementById('content');el.focus();el.setSelectionRange(el.value.length,el.value.length);window.wpActiveEditor='content';});
   await insertButton.click();
   const picker=page.frameLocator('#TB_iframeContent').locator('input.insert-shortcode[title="'+shortcode+'"]');
   await picker.waitFor({state:'visible',timeout:15000});
   await picker.click();
   await page.waitForFunction(s=>document.getElementById('content')?.value.includes(s),shortcode,{timeout:30000});
   const modified=await page.locator('#content').inputValue();
   assert.equal(modified.split(shortcode).length-1,1,'Duplicate shortcode');
   assert.equal(modified.replace(shortcode,'').trim(),original.trim(),'Unexpected homepage content changes');
   await page.locator('#publish').click();
   await page.waitForLoadState('domcontentloaded');
  }
  await page.goto(editUrl,{waitUntil:'domcontentloaded'});
  const readback=await page.locator('#content').inputValue();
  assert.equal(readback.split(shortcode).length-1,1,'Home shortcode missing after reload');
  completed=true;
  console.log('HOME02PRODUCTS_CMS_PASS='+JSON.stringify({table:ID,homepage:PAGE_ID,ids:matched.map(x=>x.id),missing}));
 }catch(error){
  console.error('HOME02PRODUCTS_FAIL='+String(error));
  if(created&&!completed)console.error('HOME02PRODUCTS_RECOVERY_REQUIRED_TABLE='+created+' (verify before any retry)');
  process.exitCode=1;
 }finally{await browser.close()}
};
run().catch(e=>{console.error(e);process.exitCode=1});
