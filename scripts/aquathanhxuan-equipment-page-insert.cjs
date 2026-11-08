'use strict';
// One-time idempotent native Insert Code for already verified Home 06/07 parents.
// Does not edit any Product, category or ESC Table; only Page 82454.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const WP='https://admin.aquathanhxuan.io.vn',PAGE=82454;
const baseline=['home_00','home_01','home_02','home_03','home_04','home_05'];
const required=['home_00','home_01','home_02','home_03','home_04','home_06','home_07','home_05'];
const sections=[
 {id:'home_06',child:'tool_home06products',count:10,after:'home_04'},
 {id:'home_07',child:'tool_home07products',count:9,after:'home_06'}
];
assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WordPress admin credentials');
const getIds=html=>[...html.matchAll(/\[table\s+id=['"]?([a-zA-Z0-9_-]+)/g)].map(m=>m[1]);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.setDefaultTimeout(20000);
 page.on('dialog',async d=>{if(d.type()==='beforeunload')await d.accept();else await d.dismiss()});
 try{
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:50000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  for(const sec of sections){
   const get=async id=>{
    const r=await page.request.get(WP+'/wp-json/tablepress/v1/table/'+id+'?verify='+Date.now(),{timeout:35000});
    assert.equal(r.status(),200,'Missing native ESC Table '+id);
    return r.json();
   };
   const parent=await get(sec.id),child=await get(sec.child);
   assert.equal(parent.items?.length,1,'Wrong parent item count '+sec.id);
   assert.equal(parent.items[0]['shortcode-products'],sec.child,'Parent-Child linkage missing '+sec.id);
   assert.equal(child.meta?.api,'Product','Child source not Product '+sec.child);
   const ids=child.items.map(x=>String(x.key||x['api-key']||''));
   assert.equal(ids.length,sec.count,'Child reference count mismatch '+sec.child);
   assert(ids.every(x=>/^\d+$/.test(x))&&new Set(ids).size===sec.count,'Malformed child references');
   console.log('EQUIPMENT_NATIVE_PARENT_READBACK_PASS='+sec.id+' '+sec.child+' count='+ids.length);
  }
  const edit=WP+'/wp-admin/post.php?post='+PAGE+'&action=edit&esc_full_admin=1';
  await page.goto(edit,{waitUntil:'domcontentloaded',timeout:45000});
  const original=await page.locator('#content').inputValue();
  const before=getIds(original);
  assert.deepEqual(before.filter(x=>baseline.includes(x)),baseline,'Old homepage section order changed');
  assert(before.every(x=>required.includes(x)),'Unexpected Page shortcode');
  for(const sec of sections)
   assert(before.filter(x=>x===sec.id).length<=1,'Duplicate existing section '+sec.id);
  const missing=sections.filter(x=>!before.includes(x.id));
  if(missing.length){
   // WordPress optimized admin sometimes hides the native Text toolbar even
   // after TinyMCE.hide(). Make the actual Classic Editor Quicktags bar visible
   // without editing the textarea or inserting raw shortcode HTML.
   const editorState=await page.evaluate(()=>{
    const tinymceEditor=window.tinymce?.get('content');
    if(tinymceEditor&&!tinymceEditor.isHidden())tinymceEditor.hide();
    const wrap=document.getElementById('wp-content-wrap');
    if(!wrap)throw Error('Native Classic Editor wrapper missing');
    wrap.classList.remove('tmce-active');
    wrap.classList.add('html-active');
    const button=document.getElementById('qt_content_tablepress_quicktags_button');
    if(!(button instanceof HTMLInputElement))throw Error('TablePress native Quicktag not registered');
    return {editorHidden:!tinymceEditor||tinymceEditor.isHidden(),mode:wrap.className,
      quicktagVisible:getComputedStyle(button).display!=='none'&&
        getComputedStyle(button.parentElement).display!=='none'};
   });
   console.log('EQUIPMENT_NATIVE_EDITOR_STATE='+JSON.stringify(editorState));
   assert(editorState.editorHidden&&editorState.quicktagVisible,
     'WordPress native Text Quicktags toolbar remains unavailable');
   assert.equal(await page.locator('#content').inputValue(),original,
     'Switching to native Text toolbar changed WordPress content');
   for(const sec of missing){
    const prior=await page.locator('#content').inputValue();
    const token='[table id='+sec.after+' /]';
    const index=prior.indexOf(token);
    assert(index>=0,'Insertion anchor not found '+sec.after);
    const open=prior.lastIndexOf('<div',index);
    const close=prior.indexOf('</div>',index);
    assert(open>=0&&close>index,'Insertion anchor not inside a native wrapper');
    const segment=prior.slice(open,close+6);
    assert(segment.includes('tablepress-preview-wrap')&&
      segment.includes('data-table-id="'+sec.after+'"'),
      'Insertion anchor is not the correct native TablePress wrapper');
    const cursor=close+6;
    await page.evaluate(pos=>{
      const textarea=document.getElementById('content');
      if(!(textarea instanceof HTMLTextAreaElement))throw Error('Native Page textarea missing');
      textarea.focus();textarea.setSelectionRange(pos,pos);window.wpActiveEditor='content';
    },cursor);
    const button=page.locator('#qt_content_tablepress_quicktags_button');
    await button.waitFor({state:'visible',timeout:12000});
    await button.click();
    const shortcode='[table id='+sec.id+' /]';
    const picker=page.frameLocator('#TB_iframeContent').locator('input.insert-shortcode[title="'+shortcode+'"]');
    await picker.waitFor({state:'visible',timeout:18000});
    await picker.click();
    await page.waitForFunction(shortcode=>document.getElementById('content')?.value.includes(shortcode),
      shortcode,{timeout:25000});
    const modified=await page.locator('#content').inputValue();
    assert.equal(getIds(modified).filter(id=>id===sec.id).length,1,'Duplicate Page insertion '+sec.id);
    const at=modified.indexOf(shortcode),start=modified.lastIndexOf('<div',at),
      end=modified.indexOf('</div>',at)+6;
    assert(start>=0&&end>at,'New native Insert Code wrapper missing '+sec.id);
    const wrapper=modified.slice(start,end);
    assert(wrapper.includes('tablepress-preview-wrap')&&wrapper.includes('data-table-id="'+sec.id+'"'),
      'New native Insert Code wrapper has wrong identity '+sec.id);
    assert(!/<script\b|<iframe\b/i.test(wrapper),'Unsafe shortcode wrapper '+sec.id);
    assert.equal(modified.slice(0,start)+modified.slice(end),prior,
      'Inserting native shortcode unexpectedly rewrote other Page HTML '+sec.id);
    console.log('EQUIPMENT_NATIVE_INSERT_PASS='+sec.id);
   }
   const expected=await page.locator('#content').inputValue();
   assert.deepEqual(getIds(expected),required,'Homepage shortcode order incorrect after insertion');
   await page.locator('#publish').click();
   await page.waitForTimeout(1800);
   const verifyContext=await browser.newContext();
   await verifyContext.addCookies(await page.context().cookies());
   const verify=await verifyContext.newPage();
   await verify.goto(edit,{waitUntil:'domcontentloaded',timeout:45000});
   const persisted=await verify.locator('#content').inputValue();
   assert.equal(persisted,expected,'WordPress native Page read-after-write mismatch');
   await verifyContext.close();
  }
  await page.goto(edit,{waitUntil:'domcontentloaded',timeout:45000});
  const final=await page.locator('#content').inputValue();
  assert.deepEqual(getIds(final),required,'Homepage must contain exactly eight native sections');
  console.log('EQUIPMENT_NATIVE_PAGE_PASS='+JSON.stringify({page:PAGE,sections:required,created:missing.map(x=>x.id)}));
 }catch(e){console.error('EQUIPMENT_NATIVE_PAGE_FAIL='+e.stack);process.exitCode=1}
 finally{await browser.close()}
})().catch(e=>{console.error('EQUIPMENT_NATIVE_PAGE_FATAL='+e.stack);process.exitCode=1});
