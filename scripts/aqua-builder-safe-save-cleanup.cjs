'use strict';
// Recovery for the single preview-only TablePress label in controlled QA run
// 42870673248. No write if already original; never touch another table.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const WP='https://admin.aquathanhxuan.io.vn';
const ID=83810,TABLE='checkout_ui_vi',KEY='demo_quantity';
const SOURCE_RUN=String(process.env.AQUA_RECOVERY_SOURCE_RUN_ID||'42870673248');
assert(/^\d+$/.test(SOURCE_RUN),'Invalid controlled QA run ID');
const ORIGINAL='Số lượng: 1', MARKER=ORIGINAL+' [QA-'+SOURCE_RUN+']';
const OUT='artifacts/aqua-builder-save-cleanup';
fs.mkdirSync(OUT,{recursive:true});
const audit={status:'STARTED',table:TABLE,key:KEY,source_run:SOURCE_RUN,
  changed:0,skipped_unchanged:0,temporary_created:0,cleanup_remaining:1};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(audit,null,2)+'\n');
assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WordPress auth unavailable');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  page.setDefaultTimeout(25000);
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nonceRes=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceRes.status(),200);
  const headers={'X-WP-Nonce':(await nonceRes.text()).trim()};
  const get=async path=>{
   for(let a=0;a<4;a++){
    try{
     const r=await page.request.get(WP+path,{headers,timeout:35000,failOnStatusCode:false});
     if([429,502,503,504].includes(r.status())&&a<3){await page.waitForTimeout((a+1)*1000);continue;}
     assert.equal(r.status(),200,'CMS read unavailable');
     return r.json();
    }catch(e){
     if(!/ECONNRESET|socket hang up|ETIMEDOUT|Timeout/i.test(String(e))||a===3)throw e;
     await page.waitForTimeout((a+1)*1000);
    }
   }
  };
  const p=await get('/wp-json/wp/v2/pages/'+ID+'?context=edit');
  assert(p.status==='publish'&&p.slug==='checkout'&&p.acf?.action==='CheckoutPage');
  assert(String(p.content?.raw||'').includes('[table id='+TABLE+' /]'));
  const fetchTable=()=>get('/wp-json/tablepress/v1/table/'+TABLE+'?_cleanup='+Date.now());
  const t=await fetchTable();
  assert.deepEqual(t.fields?.map(x=>x.key),['key','label']);
  assert.equal(t.items?.length,59);
  assert(!String(t.meta?.api||'').trim());
  const positions=t.items.map((item,i)=>item.key===KEY?i:-1).filter(i=>i>=0);
  assert.deepEqual(positions,[58],'Target row identity mismatch');
  const row=58;
  const actual=t.items[row].label;
  if(actual===ORIGINAL){
    audit.skipped_unchanged=1;
    audit.cleanup_remaining=0;save();
    console.log('AQUA_BUILDER_QA_CLEANUP_ALREADY_ORIGINAL_PASS table='+TABLE+' row='+row);
  }else{
    assert.equal(actual,MARKER,'Unexpected concurrent label edit; refuse overwrite');
    // Native TablePress AJAX writer preserves every existing cell and option.
    await page.goto(WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+TABLE,
      {waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:22000});
    const data=await page.evaluate(()=>window.tp.editor.getData());
    assert.equal(data.length,61);assert.deepEqual(data[0],['key','label']);
    assert.equal(data[row+2][0],KEY);assert.equal(data[row+2][1],MARKER);
    for(let i=0;i<t.items.length;i++){
      assert.equal(String(data[i+2][0]),String(t.items[i].key));
      assert.equal(String(data[i+2][1]),String(t.items[i].label));
    }
    const next=data.map(x=>[...x]);next[row+2][1]=ORIGINAL;
    const editNonce=(await page.content()).match(/edit_table:\s*'([^']+)'/)?.[1];
    assert(editNonce,'TablePress edit nonce missing');
    const form=new URLSearchParams();
    for(const [key,value] of [
      ['action','tablepress_save_table'],['_ajax_nonce',editNonce],
      ['tablepress[id]',TABLE],['tablepress[new_id]',TABLE],
      ['tablepress[name]',String(t.name||TABLE)],
      ['tablepress[description]',String(t.description||'')],
      ['tablepress[data]',JSON.stringify(next)],
      ['tablepress[options]',JSON.stringify(t.options||{})],
      ['tablepress[visibility]',JSON.stringify(t.visibility||{rows:next.map(()=>1),columns:[1,1]})],
      ['tablepress[number][rows]',String(next.length)],['tablepress[number][columns]','2'],
      ['custom_api',''],['custom_image',''],['custom_cols',''],['custom_rows','']
    ])form.append(key,value);
    const result=await page.evaluate(async body=>{
      const response=await fetch('/wp-admin/admin-ajax.php',{method:'POST',
        credentials:'same-origin',headers:{
          'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body});
      return {status:response.status,json:await response.json()};
    },form.toString());
    assert(result.status===200&&result.json?.success===true&&result.json?.table_id===TABLE,
      'Native TablePress restore failed');
    let after=null;
    for(let i=0;i<7;i++){
      after=await fetchTable();
      if(after.items?.[row]?.label===ORIGINAL)break;
      await page.waitForTimeout(1000);
    }
    assert(after&&after.items?.[row]?.label===ORIGINAL,'Restored label readback missing');
    for(let i=0;i<t.items.length;i++){
      assert.equal(after.items[i].key,t.items[i].key,'Unrelated key modified');
      if(i!==row)assert.equal(after.items[i].label,t.items[i].label,'Unrelated label modified');
    }
    audit.changed=1;audit.cleanup_remaining=0;save();
    console.log('AQUA_BUILDER_QA_CLEANUP_RESTORED_PASS table='+TABLE+' row='+row);
  }
  audit.status='PASS';save();
  console.log('AQUA_BUILDER_QA_CLEANUP_PASS cleanup_remaining=0');
 }finally{await browser.close();}
})().catch(e=>{
 audit.status='CLEANUP_FAILED';
 audit.error=String(e?.message||e).split('\n')[0].slice(0,240);
 save();
 console.error('AQUA_BUILDER_QA_CLEANUP_FAILED '+audit.error);
 process.exitCode=1;
});