'use strict';
/* READ-ONLY production QA: WP Pages and ESC tables; no password reset, email, order or CMS writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const ORIGIN='https://aquathanhxuan.io.vn';
const WP='https://admin.aquathanhxuan.io.vn';
const OUT='artifacts/aqua-password-business-preview';
fs.mkdirSync(OUT,{recursive:true});
const targets=[
  {slug:'quen-mat-khau',id:83827,table:'lost_password_vi',keys:12,states:['form','success','error']},
  {slug:'dat-lai-mat-khau',id:83829,table:'reset_password_vi',keys:20,states:['form','invalid','success']},
];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const requests=[];
 try{
  const admin=await browser.newPage({viewport:{width:1440,height:900}});
  admin.on('request',request=>{
    if(request.method()!=='GET' && /\/api\/(?:user\/(?:lostpass|resetpass)|cart\/checkout)/.test(request.url())){
      requests.push({method:request.method(),path:new URL(request.url()).pathname});
    }
  });
  await admin.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await admin.locator('#user_login').count()){
    assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD,'Missing WP login credentials');
    await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
    await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
    await admin.locator('#wp-submit').click();
  }
  await admin.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nonceResponse=await admin.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonceResponse.status(),200,'Missing WordPress nonce');
  const nonce=(await nonceResponse.text()).trim();
  for(const t of targets){
    // Independent read-back of native TablePress and matching public Page.
    const tableResponse=await admin.request.get(WP+'/wp-json/tablepress/v1/table/'+t.table+'?_esc_qa='+Date.now(),
      {headers:{'X-WP-Nonce':nonce},timeout:40000});
    assert.equal(tableResponse.status(),200,'Cannot read native TablePress '+t.table);
    const data=await tableResponse.json();
    assert.equal(data.items?.length,t.keys,'Wrong native ESC row count '+t.table);
    assert(data.items.every(item=>String(item.key||'').trim()&&String(item.label||'').trim()));
    const website=await admin.goto(ORIGIN+'/'+t.slug,{waitUntil:'domcontentloaded',timeout:55000});
    assert(website&&website.status()===200,'Public route is not 200 '+t.slug);
    const labels=JSON.parse(await admin.locator('#main-content').getAttribute('data-business-labels')||'{}');
    assert.equal(Object.keys(labels).length,t.keys,'Missing runtime labels '+t.slug);
    assert.equal(await admin.locator('h1').first().textContent().then(s=>s.trim()),labels.title,
      'H1 not sourced from WordPress '+t.slug);
    console.log('AQUA_PASSWORD_PRODUCTION_PAGE_PASS='+t.slug+' rows='+t.keys);
    await admin.goto(WP+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page='+t.id,
      {waitUntil:'domcontentloaded',timeout:65000});
    const frame=admin.frameLocator('#esc-vb-frame');
    await frame.locator('#esc-business-preview-state').waitFor({state:'visible',timeout:60000});
    const picker=frame.locator('#esc-business-preview-state');
    const found=await picker.locator('option').evaluateAll(opts=>opts.map(option=>option.value));
    assert.deepEqual(found,t.states,'Wrong business preview states for '+t.slug);
    for(const state of t.states){
      await picker.selectOption(state);
      await frame.locator('#esc-business-preview-state').waitFor({state:'visible',timeout:60000});
      const selected=await frame.locator('#esc-business-preview-state').inputValue();
      assert.equal(selected,state,'Preview state did not change '+t.slug+':'+state);
      const attr=await frame.locator('h1').first().evaluate(el=>({
        table:el.getAttribute('data-esc-source-table'),
        field:el.getAttribute('data-esc-source-field'),
        version:el.getAttribute('data-esc-rendered-version'),
        row:el.getAttribute('data-esc-source-row')
      }));
      assert.equal(attr.table,t.table,'Missing live cell source: '+t.slug);
      assert.equal(attr.field,'label');
      assert.match(attr.version||'',/^[a-f0-9]{64}$/,'Missing table version');
      assert.equal(attr.row,'0');
      console.log('AQUA_PASSWORD_BUILDER_STATE_PASS='+t.slug+':'+state);
    }
    await frame.locator('h1').first().click();
    await admin.locator('#esc-vb-edit-title').waitFor({state:'visible',timeout:25000});
    assert.equal(await admin.locator('#esc-vb-edit-title').isDisabled(),false,'ESC cell not editable');
    await admin.screenshot({path:OUT+'/'+t.slug+'-builder.png',fullPage:false});
    console.log('AQUA_PASSWORD_BUILDER_CELL_PASS='+t.slug);
  }
  assert.deepEqual(requests,[],'Preview attempted a real mutation: '+JSON.stringify(requests));
  console.log('AQUA_PASSWORD_BUSINESS_PREVIEW_PRODUCTION_QA_PASS NO_EMAIL NO_PASSWORD_RESET NO_ORDERS NO_CMS_WRITES');
 }finally{await browser.close();}
})().catch(error=>{console.error('AQUA_PASSWORD_BUSINESS_PREVIEW_PRODUCTION_QA_FAIL '+String(error.stack||error));process.exitCode=1;});
