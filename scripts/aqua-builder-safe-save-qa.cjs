'use strict';
// Controlled, reversible production QA: one preview-only label cell.
// WRITE_SCOPE: checkout_ui_vi label for key demo_quantity on Page 83810.
// No customer/order/product/checkout/email/payment writes, no test records.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn', TABLE='checkout_ui_vi', ID=83810;
const KEY='demo_quantity', OUT='artifacts/aqua-builder-safe-save';
const request=JSON.parse(fs.readFileSync('qa-requests/aqua-builder-safe-save.json','utf8'));
assert.equal(request.environment,'production');
assert.equal(request.mode,'controlled-one-cell-reversible');
assert.equal(request.page_id,ID);assert.equal(request.table_id,TABLE);
assert.equal(request.key,KEY);
assert.equal(request.php_source_sha,'9328a023934c78e2054406fed0edb3c11a45fff9');
assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD);
assert(/^\d+$/.test(process.env.GITHUB_RUN_ID||''));
fs.mkdirSync(OUT,{recursive:true});
const audit={result:'STARTED',page_id:ID,table_id:TABLE,key:KEY,
  changed:0,restored:0,temporary_created:0,cleanup_remaining:0};
const record=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(audit,null,2)+'\n');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let page,nonce='',base=null,idx=-1,original='',marker='';
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const rest=async url=>{
   for(let a=0;a<4;a++){
     try{
       const r=await page.request.get(url,{headers:{'X-WP-Nonce':nonce},
         timeout:35000,failOnStatusCode:false});
       if([429,502,503,504].includes(r.status()) && a<3){await sleep((a+1)*1000);continue;}
       assert.equal(r.status(),200,'WordPress source GET failed');
       return r.json();
     }catch(e){
       if(!/ECONNRESET|socket hang up|ETIMEDOUT|Timeout/i.test(String(e))||a===3)throw e;
       await sleep((a+1)*1000);
     }
   }
   throw Error('WordPress read retries exhausted');
 };
 const table=()=>rest(WP+'/wp-json/tablepress/v1/table/'+TABLE+'?builder_save_qa='+Date.now());
 const expectLabel=async value=>{
   for(let a=0;a<9;a++){
     if((await table()).items[idx]?.label===value)return;
     await sleep(1000);
   }
   throw Error('Native REST label readback did not match editor Save');
 };
 const selectEditor=async current=>{
   await page.goto(WP+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page='+ID,
     {waitUntil:'domcontentloaded',timeout:60000});
   const headline=page.frameLocator('#esc-vb-frame')
     .locator('h1[data-esc-source-table="'+TABLE+'"]');
   await headline.waitFor({state:'visible',timeout:65000});
   await headline.click();
   const item=page.locator('#esc-vb-edit-row option[value="'+idx+':label"]');
   await item.waitFor({state:'attached',timeout:30000});
   await page.locator('#esc-vb-edit-row').selectOption(String(idx)+':label');
   const editor=page.locator('#esc-vb-edit-title');
   assert.equal(await editor.isEnabled(),true,'Cell editor is not enabled');
   assert.equal(await editor.inputValue(),current,'Editor source changed since REST readback');
   return editor;
 };
 const write=async(before,after)=>{
   const editor=await selectEditor(before);
   await editor.fill(after);
   assert.equal(await page.locator('#esc-vb-edit-save').isEnabled(),true,'Save button disabled');
   const responsePromise=page.waitForResponse(r=>
     r.request().method()==='POST' &&
     r.url().includes('/wp-json/esc-builder/v1/save-text'),{timeout:30000}).catch(()=>null);
   await page.locator('#esc-vb-edit-save').click();
   const response=await responsePromise;
   if(response){
     const body=await response.json().catch(()=>({}));
     audit.last_save_http=response.status();
     audit.last_save_code=String(body?.code||'none').slice(0,80);
     audit.last_save_saved=Boolean(body?.saved);
   }else audit.last_save_http='NO_RESPONSE';
   record();
   try{
     await page.waitForFunction(()=>String(document.querySelector('#esc-vb-edit-feedback')?.textContent||'')
       .includes('Đã lưu WordPress'),null,{timeout:12000});
   }catch(error){
     audit.ui_feedback=String(await page.locator('#esc-vb-edit-feedback').textContent().catch(()=>'')).
       replace(/\s+/g,' ').slice(0,250);
     record();
     throw Error('Editor did not acknowledge canonical Save');
   }
   await expectLabel(after);
   // The user edits the visible Page, so a Save is not accepted unless the
   // verified native cell also reflects the committed value immediately.
   const live=page.frameLocator('#esc-vb-frame')
     .locator('[data-esc-source-type="esc_table"][data-esc-source-table="'+TABLE+'"]'+
       '[data-esc-source-row="'+idx+'"][data-esc-source-field="label"]:visible').first();
   await live.filter({hasText:after}).waitFor({state:'visible',timeout:12000});
   assert.equal((await live.innerText()).trim(),after,'Live Builder label not updated after Save');
 };
 const restoreNative=async()=>{
   const current=await table();
   assert.equal(current.items?.[idx]?.label,marker,'Restore source changed concurrently');
   await page.goto(WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+TABLE,
     {waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:22000});
   const grid=await page.evaluate(()=>window.tp.editor.getData());
   assert.equal(grid.length,base.length+2);
   assert.deepEqual(grid[0],['key','label']);
   for(let i=0;i<base.length;i++){
     assert.equal(grid[i+2][0],base[i].key,'Native key mismatch on rollback');
     assert.equal(grid[i+2][1],current.items[i].label,'Native label mismatch on rollback');
   }
   const newGrid=grid.map(row=>[...row]);
   newGrid[idx+2][1]=original;
   const editNonce=(await page.content()).match(/edit_table:\s*'([^']+)'/)?.[1];
   assert(editNonce,'Cannot read native TablePress editing nonce');
   const form=new URLSearchParams();
   for(const [key,value] of [
     ['action','tablepress_save_table'],['_ajax_nonce',editNonce],
     ['tablepress[id]',TABLE],['tablepress[new_id]',TABLE],
     ['tablepress[name]',String(current.name||TABLE)],
     ['tablepress[description]',String(current.description||'')],
     ['tablepress[data]',JSON.stringify(newGrid)],
     ['tablepress[options]',JSON.stringify(current.options||{})],
     ['tablepress[visibility]',JSON.stringify(current.visibility||{
       rows:newGrid.map(()=>1),columns:[1,1]})],
     ['tablepress[number][rows]',String(newGrid.length)],
     ['tablepress[number][columns]','2'],
     ['custom_api',''],['custom_image',''],['custom_cols',''],['custom_rows','']
   ])form.append(key,value);
   const result=await page.evaluate(async body=>{
     const res=await fetch('/wp-admin/admin-ajax.php',{method:'POST',
       credentials:'same-origin',
       headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body});
     return {status:res.status,json:await res.json()};
   },form.toString());
   assert(result.status===200&&result.json?.success===true&&result.json?.table_id===TABLE,
     'Native TablePress rollback failed');
   await expectLabel(original);
 };
 try{
   page=await browser.newPage({viewport:{width:1440,height:900}});
   await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
   if(await page.locator('#user_login').count()){
     await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
     await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
     await page.locator('#wp-submit').click();
   }
   await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
   const nonceRes=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
   assert.equal(nonceRes.status(),200);
   nonce=(await nonceRes.text()).trim();
   const p=await rest(WP+'/wp-json/wp/v2/pages/'+ID+'?context=edit');
   assert(p.status==='publish'&&p.slug==='checkout'&&p.acf?.action==='CheckoutPage');
   assert(String(p.content?.raw||'').includes('[table id='+TABLE+' /]'));
   const t=await table();
   assert.deepEqual(t.fields?.map(x=>x.key),['key','label']);
   assert.equal(t.items?.length,59);
   assert(!String(t.meta?.api||'').trim());
   const positions=t.items.map((x,i)=>x.key===KEY?i:-1).filter(i=>i>=0);
   assert.equal(positions.length,1,'Preview label key not unique');
   idx=positions[0];assert(idx>=40,'Target does not test long TablePress editor');
   original=t.items[idx].label;
   assert(typeof original==='string'&&original.trim()&&!/[<>]/.test(original));
   base=t.items;
   marker=original+' [QA-'+process.env.GITHUB_RUN_ID+']';
   assert.deepEqual((await table()).items,base,'Source changed before QA');
   await write(original,marker);
   audit.changed=1;record();
   const now=await table();
   for(let i=0;i<base.length;i++){
     if(i!==idx)assert.deepEqual(now.items[i],base[i],'Another cell changed');
   }
   console.log('AQUA_BUILDER_CONTROLLED_SAVE_PASS table='+TABLE+' row='+idx+' field=label');
 }finally{
   try{
     if(page&&base&&idx>=0){
       // In case Save succeeded but UI response timed out, decide from REST.
       const current=await table();
       const value=current.items?.[idx]?.label;
       if(value===marker){
         try{
           await write(marker,original);
         }catch(error){
           audit.ui_restore_error=String(error?.message||error).split('\n')[0].slice(0,180);
           record();
           await restoreNative();
         }
         audit.restored=1;
       }else if(value!==original){
         throw Error('Concurrent source edit: cannot safely restore a different value');
       }
       assert.deepEqual((await table()).items,base,'Native TablePress restore mismatch');
       audit.cleanup_remaining=0;record();
       console.log('AQUA_BUILDER_CONTROLLED_RESTORE_PASS table='+TABLE+' row='+idx);
     }
   }catch(e){
     audit.result='CLEANUP_FAILED';audit.cleanup_remaining=1;
     audit.error=String(e?.message||e).split('\n')[0].slice(0,220);
     // This preview-only label is not personal data; keep its original value
     // only if cleanup failed so the owner can recover it safely.
     audit.original_label=original;record();
     console.error('AQUA_BUILDER_CONTROLLED_CLEANUP_FAILED table='+TABLE+' row='+idx);
     process.exitCode=1;
   }
   await browser.close();
 }
 if(audit.result==='CLEANUP_FAILED')return;
 assert.equal(audit.changed,1,'No confirmed Save');
 assert.equal(audit.restored,1,'No confirmed rollback');
 audit.result='PASS';record();
 console.log('AQUA_BUILDER_CONTROLLED_SAVE_RESTORE_PASS changed=1 restored=1 cleanup_remaining=0');
})().catch(e=>{
 if(audit.result!=='CLEANUP_FAILED')audit.result='FAIL';
 audit.error=String(e?.message||e).split('\n')[0].slice(0,240);
 record();console.error('AQUA_BUILDER_CONTROLLED_QA_FAIL '+audit.error);
 process.exitCode=1;
});