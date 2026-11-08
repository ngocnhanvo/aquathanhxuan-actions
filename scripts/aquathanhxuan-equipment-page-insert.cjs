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
   // Generate all wrappers via WordPress Insert Code first. Do not rewrite
   // the textarea between picker activations: the optimized WP editor retains
   // a stale Quicktags selection buffer after each insertion.
   for(const sec of missing){
    await page.evaluate(()=>{
      const editor=window.tinymce?.get('content');
      if(editor&&!editor.isHidden())editor.hide();
      const wrap=document.getElementById('wp-content-wrap');
      wrap?.classList.remove('tmce-active');wrap?.classList.add('html-active');
      const textarea=document.getElementById('content');
      if(!(textarea instanceof HTMLTextAreaElement))throw Error('Native textarea not found');
      textarea.focus();textarea.setSelectionRange(textarea.value.length,textarea.value.length);
      window.wpActiveEditor='content';
    });
    const button=page.locator('#qt_content_tablepress_quicktags_button');
    await button.waitFor({state:'visible',timeout:12000});
    await button.evaluate(element=>{
      if(!(element instanceof HTMLInputElement))throw Error('Native Quicktags button missing');
      element.click();
    });
    const shortcode='[table id='+sec.id+' /]';
    const picker=page.frameLocator('#TB_iframeContent').locator('input.insert-shortcode[title="'+shortcode+'"]');
    await picker.waitFor({state:'visible',timeout:18000});
    await picker.click();
    await page.waitForFunction(shortcode=>document.getElementById('content')?.value.includes(shortcode),
      shortcode,{timeout:25000});
    const native=await page.locator('#content').inputValue();
    assert.equal(getIds(native).filter(id=>id===sec.id).length,1,'Native insert duplicated '+sec.id);
    console.log('EQUIPMENT_NATIVE_PICKER_PASS='+sec.id);
   }
   // The verified picker may prepend/append a newly-created wrapper regardless
   // of caret placement. Extract only those exact wrappers. The remaining
   // legacy Page HTML must be unchanged except one trailing newline, which the
   // WordPress native handler removes. No manually invented preview wrappers.
   let generated=await page.locator('#content').inputValue();
   const nativeWrappers=new Map();
   for(const sec of [...missing].reverse()){
    const token='[table id='+sec.id+' /]';
    const at=generated.indexOf(token);
    assert(at>=0,'New native shortcode missing '+sec.id);
    const open=generated.lastIndexOf('<div',at),close=generated.indexOf('</div>',at)+6;
    assert(open>=0&&close>at,'Native Insert Code wrapper missing '+sec.id);
    const wrapper=generated.slice(open,close);
    assert(wrapper.includes('tablepress-preview-wrap')&&
      wrapper.includes('data-table-id="'+sec.id+'"'),
      'Unexpected native ESC Table wrapper identity '+sec.id);
    assert(!/<script\b|<iframe\b/i.test(wrapper),'Native wrapper contains executable markup');
    nativeWrappers.set(sec.id,wrapper);
    generated=generated.slice(0,open)+generated.slice(close);
   }
   const preserved=generated===original||
     (/\r?\n$/.test(original)&&generated===original.replace(/\r?\n$/,''));
   if(!preserved){
    let first=0;while(first<Math.min(generated.length,original.length)&&
      generated[first]===original[first])first++;
    console.log('EQUIPMENT_NATIVE_EDITOR_DIFF='+JSON.stringify({
      first,originalLength:original.length,recoveredLength:generated.length,
      before:original.slice(Math.max(0,first-100),first+180),
      after:generated.slice(Math.max(0,first-100),first+180)
    }));
   }
   assert(preserved,'WordPress picker changed unrelated Page HTML');
   let positioned=original;
   for(const sec of missing){
    const token='[table id='+sec.after+' /]';
    const at=positioned.indexOf(token);
    assert(at>=0,'Native insert anchor missing '+sec.after);
    const start=positioned.lastIndexOf('<div',at);
    const close=positioned.indexOf('</div>',at)+6;
    assert(start>=0&&close>at,'Native anchor wrapper missing '+sec.after);
    const wrapperBefore=positioned.slice(start,at);
    assert(wrapperBefore.includes('tablepress-preview-wrap')&&
      wrapperBefore.includes('data-table-id="'+sec.after+'"'),
      'Native anchor identity mismatch '+sec.after);
    positioned=positioned.slice(0,close)+nativeWrappers.get(sec.id)+positioned.slice(close);
    console.log('EQUIPMENT_NATIVE_INSERT_PASS='+sec.id);
   }
   await page.evaluate(value=>{
     const textarea=document.getElementById('content');
     if(!(textarea instanceof HTMLTextAreaElement))throw Error('WordPress textarea unavailable');
     textarea.value=value;
     textarea.dispatchEvent(new Event('input',{bubbles:true}));
     textarea.dispatchEvent(new Event('change',{bubbles:true}));
     const editor=window.tinymce?.get('content');
     if(editor&&!editor.isHidden())editor.hide();
     const wrap=document.getElementById('wp-content-wrap');
     wrap?.classList.remove('tmce-active');wrap?.classList.add('html-active');
   },positioned);
   assert.equal(await page.locator('#content').inputValue(),positioned,'Native Page placement drift');
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
