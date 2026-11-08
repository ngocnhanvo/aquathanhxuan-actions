// Native, scoped ESC Table API source repair. Does not edit any products.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const expected=JSON.parse(fs.readFileSync('chatgpt/home02products-import-status.json','utf8'));
assert.equal(expected.imported_step,'success','Destination products not fully imported');
const ids=(expected.mappings||[]).map(x=>String(x.target_id));
assert.equal(ids.length,10,'Expected ten verified imported IDs');
const WP='https://admin.aquathanhxuan.io.vn';
const tableId='home_02products';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const p=await browser.newPage();
 p.setDefaultTimeout(20000);
 p.on('dialog',async d=>{if(d.type()==='beforeunload')await d.accept();else await d.dismiss()});
 try{
  await p.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded'});
  if(await p.locator('#user_login').count()){
   await p.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await p.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await p.locator('#wp-submit').click();
  }
  await p.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const publicUrl=WP+'/wp-json/tablepress/v1/table/'+tableId;
  const readTable=async()=>{const r=await p.request.get(publicUrl+'?ts='+Date.now());
   assert.equal(r.status(),200,'TablePress REST unavailable');return r.json()};
  const before=await readTable();
  const actual=(before.items||[]).map(x=>String(x.key||'')).filter(Boolean);
  assert.deepEqual(actual,ids,'Refuse to edit table with nonmatching Product IDs');
  const current=String(before.meta?.api||'');
  assert(current===''||current==='Product','Cannot change another API source');
  if(current==='Product'){console.log('HOME02_API_ALREADY_PRODUCT=PASS');return;}
  const editorUrl=WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+tableId;
  await p.goto(editorUrl,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:20000});
  const originalRows=await p.evaluate(()=>window.tp.editor.getData());
  assert.deepEqual(originalRows.slice(2).map(x=>String(x[0])),ids,
   'TablePress native row order does not match REST source');
  const selector=p.locator('#js_custom_api_source');
  await selector.waitFor({state:'visible',timeout:15000});
  await selector.selectOption('Product');
  await p.waitForFunction(()=>document.querySelector('#js_custom_api')?.value==='Product',
    null,{timeout:12000});
  await p.getByRole('button',{name:'Save Changes'}).first().click();
  await p.waitForTimeout(2000);
  await p.goto(editorUrl,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:20000});
  const savedRows=await p.evaluate(()=>window.tp.editor.getData());
  assert.deepEqual(savedRows,originalRows,'API source repair modified Product row data');
  const after=await readTable();
  assert.equal(after.meta?.api,'Product','Native API selector failed to persist');
  assert.deepEqual((after.items||[]).map(x=>String(x.key||'')).filter(Boolean),ids);
  console.log('HOME02_PRODUCT_API_FIXED=PASS '+JSON.stringify({table:tableId,api:'Product',products:ids}));
 }catch(e){console.error('HOME02_API_FIX_FAIL='+String(e.stack||e));process.exitCode=1}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
