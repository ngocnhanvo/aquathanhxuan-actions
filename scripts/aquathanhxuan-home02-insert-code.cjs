const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const env=Object.fromEntries((process.env.ENV_FILE||'').split(/\r?\n/).map(x=>x.match(/^\s*(WC_URL)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(x=>[x[1],x[2].replace(/^['"]|['"]$/g,'')]));
assert.equal(env.WC_URL,'https://admin.aquathanhxuan.io.vn');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 const page=await browser.newPage();
 page.setDefaultTimeout(16000);
 page.on('dialog',async d=>{if(d.type()==='beforeunload')await d.accept();else await d.dismiss();});
 try{
  await page.goto(env.WC_URL+'/wp-login.php',{waitUntil:'domcontentloaded'});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'));
  await page.goto(env.WC_URL+'/wp-admin/post.php?post=82454&action=edit&esc_full_admin=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.tinymce?.get('content')?.getWin?.() && window.tinymce?.get('content')?.getBody?.()),null,{timeout:20000});
  await page.evaluate(()=>{window.switchEditors.go('content','html');window.wpActiveEditor='content';});
  await page.waitForFunction(()=>window.tinymce?.get('content')?.isHidden()===true,null,{timeout:10000});
  const before=await page.locator('#content').inputValue();
  console.log('PAGE_PRECHECK='+JSON.stringify({length:before.length,has00:before.includes('home_00'),has01:before.includes('home_01'),has02:before.includes('home_02'),tail:before.slice(-250)}));
  assert(before.includes('home_00')&&before.includes('home_01'),'existing homepage sections absent');
  assert(!before.includes('home_02'),'home_02 already inserted; refuse duplicate');
  assert(await page.evaluate(()=>typeof window.tablepress_open_shortcode_thickbox==='function'),'native Insert Code unavailable');
  await page.evaluate(()=>{const el=document.getElementById('content');el.focus();el.setSelectionRange(el.value.length,el.value.length);window.tablepress_open_shortcode_thickbox();});
  const frame=page.frameLocator('#TB_iframeContent');
  const insert=frame.locator('input.insert-shortcode[title="[table id=home_02 /]"]');
  await insert.waitFor({state:'visible',timeout:15000});
  const selectedShortcode=await insert.getAttribute('title');
  assert.equal(selectedShortcode,'[table id=home_02 /]','selected Insert Code table mismatch');
  await insert.click();
  await page.waitForTimeout(400);
  const firstResult=await page.locator('#content').inputValue();
  const firstTiny=await page.evaluate(()=>window.tinymce?.get('content')?.getContent?.()||'');
  if(!firstResult.includes(selectedShortcode)&&!firstTiny.includes(selectedShortcode)){
    // Invoke the exact native callback of the TablePress Insert Shortcode button.
    await page.evaluate(selected=>{if(typeof window.send_to_editor!=='function')throw Error('WordPress native callback unavailable');window.send_to_editor(selected);},selectedShortcode);
  }
  await page.waitForTimeout(600);
  const editorState=await page.evaluate(()=>({wpActiveEditor:window.wpActiveEditor||'',modeCode:document.querySelector('#content-html')?.className,modeVisual:document.querySelector('#content-tmce')?.className,tinyHidden:window.tinymce?.get('content')?.isHidden?.(),tinyContent:window.tinymce?.get('content')?.getContent?.()?.slice(-550),textarea:document.querySelector('#content')?.value.slice(-550),hasQuicktags:typeof window.QTags!=='undefined'}));
  console.log('INSERT_CODE_EDITOR_STATE='+JSON.stringify(editorState));
  if(!editorState.textarea.includes('[table id=home_02 /]') && (editorState.tinyContent||'').includes('[table id=home_02 /]')) await page.locator('#content-html').click();
  const after=await page.locator('#content').inputValue();
  const shortcode='[table id=home_02 /]';
  console.log('INSERT_CODE_RESULT='+JSON.stringify({length:after.length,contains:after.includes(shortcode),tail:after.slice(-200)}));
  assert.equal(after.split(shortcode).length-1,1,'shortcode must be inserted once');
  assert(after.startsWith(before),'native Insert Code changed existing content');
  await page.locator('#publish').click();
  await page.waitForLoadState('domcontentloaded',{timeout:20000});
  await page.goto(env.WC_URL+'/wp-admin/post.php?post=82454&action=edit&esc_full_admin=1',{waitUntil:'domcontentloaded'});
  await page.locator('#content-html').click();
  const readback=await page.locator('#content').inputValue();
  assert(readback.includes(shortcode),'saved shortcode missing');
  assert(readback.includes('home_00')&&readback.includes('home_01'),'existing sections lost');
  console.log('HOME02_PAGE_INSERT_CODE=PASS '+JSON.stringify({pageId:82454,shortcode,readbackLength:readback.length}));
 }catch(e){console.error('HOME02_PAGE_INSERT_CODE=FAIL '+e.message);process.exitCode=1;}
 finally{await browser.close();}
})();