'use strict';
/**
 * Production CMS writer with tiny WRITE_SCOPE: two existing coupons + two groups.
 * Does not create orders, customers, products, carts, demo campaigns or temp records.
 * Coupon commercial terms remain in WooCommerce native records.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const ORIGIN='https://admin.aquathanhxuan.io.vn';
const PATH='artifacts/aqua-coupon-groups-setup';
fs.mkdirSync(PATH,{recursive:true});
const report={scope:'MF5_AND_MF10_ONLY',status:'STARTED',changed:0,skipped_unchanged:0,temporary_created:0,cleanup_remaining:0,coupons:[],groups:[],orders_created:0};
const save=()=>fs.writeFileSync(PATH+'/report.json',JSON.stringify(report,null,2)+'\n');
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WordPress admin credentials');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(ORIGIN+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nonceRes=await page.request.get(ORIGIN+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:20000});
  assert(nonceRes.ok(),'Cannot read WordPress REST nonce');
  const nonce=(await nonceRes.text()).trim();
  assert(/^[A-Za-z0-9_-]{8,}$/.test(nonce),'Invalid WordPress REST nonce');
  const headers={'X-WP-Nonce':nonce,'Content-Type':'application/json'};
  async function rest(method,path,data){
   const response=await page.request.fetch(ORIGIN+path,{
    method,headers,
    data:data===undefined?undefined:JSON.stringify(data),
    timeout:40000
   });
   const raw=await response.text();
   let json;try{json=JSON.parse(raw)}catch{throw Error(method+' '+path+' non-JSON HTTP '+response.status())}
   if(!response.ok())throw Error(method+' '+path+' HTTP '+response.status()+' '+String(json.code||json.message||'').slice(0,150));
   return json;
  }
  const coupons=await rest('GET','/wp-json/wc/v3/coupons?per_page=100');
  assert(Array.isArray(coupons),'Expected published Woo coupons');
  const required=[
   {code:'mf5',type:'percent',amount:5,minimum:200001},
   {code:'mf10',type:'percent',amount:10,minimum:1000001}
  ];
  for(const rule of required){
   const found=coupons.filter(x=>String(x.code||'').toLowerCase()===rule.code);
   assert(found.length===1,'Expected exactly one existing '+rule.code+' coupon, will not create duplicates');
   const c=found[0];rule.id=c.id;
   assert(c.status==='publish','Coupon '+rule.code+' must be published');
   assert(c.discount_type===rule.type&&Number(c.amount)===rule.amount,'Unexpected commercial terms for '+rule.code+'; abort');
   // Tight allowed write: correct native minimum only if user-defined campaign tier differs.
   if(Number(c.minimum_amount)!==rule.minimum){
    await rest('PUT','/wp-json/wc/v3/coupons/'+c.id,{minimum_amount:String(rule.minimum)});
    report.changed++;
   }else report.skipped_unchanged++;
   const read=await rest('GET','/wp-json/wc/v3/coupons/'+c.id);
   assert(Number(read.minimum_amount)===rule.minimum,'Native minimum amount readback mismatch '+rule.code);
   report.coupons.push({id:c.id,code:c.code,amount:read.amount,minimum_amount:read.minimum_amount,group:'',auto_apply:false});
   save();
  }
  const taxRoute='/wp-json/wp/v2/esc_coupon_group';
  let terms=await rest('GET',taxRoute+'?per_page=100&hide_empty=false');
  assert(Array.isArray(terms),'Coupon group taxonomy REST route missing; PHP release needed first');
  const groups=[{name:'Giá trị đơn hàng',slug:'gia-tri-don-hang'},{name:'Tết',slug:'khuyen-mai-tet'}];
  for(const expected of groups){
   let term=terms.find(t=>t.slug===expected.slug);
   if(!term){
    term=await rest('POST',taxRoute,{name:expected.name,slug:expected.slug});
    assert(Number.isSafeInteger(term.id)&&term.id>0,'Created group has invalid ID');
    terms.push(term);report.changed++;
   }else report.skipped_unchanged++;
   expected.id=term.id;
   report.groups.push({id:term.id,slug:term.slug,name:term.name});
   save();
  }
  const orderGroup=groups[0].id;
  for(const rule of required){
   const editor=ORIGIN+'/wp-admin/post.php?post='+rule.id+'&action=edit';
   const resp=await page.goto(editor,{waitUntil:'domcontentloaded',timeout:60000});
   assert(resp&&resp.ok(),'Coupon editor unavailable '+rule.code);
   const groupControl=page.locator('select#_esc_aqua_coupon_group');
   const stacking=page.locator('select#_esc_aqua_stack_mode');
   const auto=page.locator('input#_wc_auto_apply');
   assert(await groupControl.count()===1,'Missing new group setting UI');
   assert(await stacking.count()===1,'Missing stacking rule UI');
   assert(await auto.count()===1,'Existing Woo Auto Coupons checkbox missing');
   const before={group:await groupControl.inputValue(),stacking:await stacking.inputValue(),auto:await auto.isChecked()};
   const changed=before.group!==String(orderGroup)||before.stacking!=='cross_group'||!before.auto;
   if(changed){
    await groupControl.selectOption(String(orderGroup));
    await stacking.selectOption('cross_group');
    if(!before.auto) await auto.check();
    await page.locator('#publish').click();
    await page.waitForLoadState('domcontentloaded',{timeout:60000});
    report.changed++;
   }else report.skipped_unchanged++;
   const afterResp=await page.goto(editor,{waitUntil:'domcontentloaded',timeout:60000});
   assert(afterResp&&afterResp.ok(),'Could not verify updated coupon '+rule.code);
   const after={group:await page.locator('select#_esc_aqua_coupon_group').inputValue(),stacking:await page.locator('select#_esc_aqua_stack_mode').inputValue(),auto:await page.locator('input#_wc_auto_apply').isChecked()};
   assert(after.group===String(orderGroup)&&after.stacking==='cross_group'&&after.auto,'WordPress coupon group UI readback failed '+rule.code+': '+JSON.stringify(after));
   const item=report.coupons.find(x=>x.id===rule.id);
   item.group=groups[0].slug;item.auto_apply=true;
   save();
  }
  const groupsAdmin=await page.goto(ORIGIN+'/wp-admin/edit-tags.php?taxonomy=esc_coupon_group&post_type=shop_coupon',{waitUntil:'domcontentloaded',timeout:60000});
  assert(groupsAdmin&&groupsAdmin.ok(),'WooCommerce coupon group management page unavailable');
  assert(await page.locator('#tag-name').count()===1,'Coupon group admin create/edit form missing');
  report.admin_group_page='PASS';
  report.status='PASS';save();
  console.log('AQUA_COUPON_GROUP_SETUP_PASS='+JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{
 report.status='FAIL';report.error=String(e.message||e).slice(0,500);save();
 console.error('AQUA_COUPON_GROUP_SETUP_FAIL='+report.error);
 process.exitCode=1;
});
