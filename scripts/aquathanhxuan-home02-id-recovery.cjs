const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const env=Object.fromEntries((process.env.ENV_FILE||'').split(/\r?\n/).map(x=>x.match(/^\s*(WC_URL)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(x=>[x[1],x[2].replace(/^['"]|['"]$/g,'')]));
assert.equal(env.WC_URL,'https://admin.aquathanhxuan.io.vn');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 const page=await browser.newPage();
 page.on('dialog',async d=>{if(d.type()==='confirm'&&/Table ID/i.test(d.message())) await d.accept();else await d.dismiss();});
 try{
  await page.goto(env.WC_URL+'/wp-login.php');
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'));
  await page.goto(env.WC_URL+'/wp-admin/admin.php?page=tablepress&action=edit&table_id=140');
  await page.waitForFunction(()=>Boolean(window.tp?.editor));
  const previous=await page.evaluate(()=>({id:document.querySelector('#table-id').value,data:window.tp.editor.getData()}));
  assert.equal(previous.id,'140');
  assert.deepEqual(previous.data[0],['title','description','image','button_label','button_href']);
  assert.equal(previous.data[2][0],'Nền thủy sinh');
  assert(previous.data[2][2].includes('wp-image-82490'));
  await page.locator('#table-id').fill('home_02');
  await page.locator('#table-id').press('Tab');
  await page.getByRole('button',{name:'Save Changes'}).first().click();
  await page.waitForTimeout(2500);
  await page.goto(env.WC_URL+'/wp-admin/admin.php?page=tablepress&action=edit&table_id=home_02');
  await page.waitForFunction(()=>Boolean(window.tp?.editor),null,{timeout:15000});
  const read=await page.evaluate(()=>({id:document.querySelector('#table-id').value,data:window.tp.editor.getData()}));
  assert.equal(read.id,'home_02');
  assert.deepEqual(read.data,previous.data);
  console.log('HOME02_RECOVERY=PASS');
 }catch(e){console.error('HOME02_RECOVERY=FAIL '+e.message);process.exitCode=1;}
 finally{await browser.close();}
})();