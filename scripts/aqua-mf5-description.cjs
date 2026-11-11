'use strict';
/** Scoped WordPress editor: correct/add description for existing MF5 only. Never touch MF10 or orders. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const ID=83818;
const DESCRIPTION='Giảm 5% cho đơn hàng trên 200.000đ';
const OUT='artifacts/aqua-mf5-description';
fs.mkdirSync(OUT,{recursive:true});
const report={status:'STARTED',scope:'MF5_COUPON_DESCRIPTION_ONLY',changed:0,skipped_unchanged:0,temporary_created:0,cleanup_remaining:0,orders_created:0};
const save=()=>fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WordPress credentials missing');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
    await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
    await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
    await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const n=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:20000});
  assert(n.ok(),'Could not read WP REST nonce');
  const nonce=(await n.text()).trim();
  assert(/^[\w-]{8,}$/.test(nonce),'Invalid nonce');
  const headers={'X-WP-Nonce':nonce,'Content-Type':'application/json'};
  async function rest(method,path,data){
    const r=await page.request.fetch(WP+path,{
      method,headers,data:data===undefined?undefined:JSON.stringify(data),timeout:40000
    });
    const raw=await r.text();let j;
    try{j=JSON.parse(raw);}catch{throw Error('Non-JSON response '+path+' HTTP '+r.status());}
    assert(r.ok(),method+' '+path+' HTTP '+r.status()+' '+String(j.code||j.message||'').slice(0,180));
    return j;
  }
  const mf5=await rest('GET','/wp-json/wc/v3/coupons/'+ID);
  assert(String(mf5.code||'').toLowerCase()==='mf5','Coupon ID mismatch; abort');
  assert(mf5.status==='publish','MF5 is not published');
  assert(mf5.discount_type==='percent'&&Number(mf5.amount)===5,'MF5 amount not 5%; do not overwrite business terms');
  assert(Number(mf5.minimum_amount)===200001,'MF5 minimum changed; do not overwrite business terms');
  const before=String(mf5.description||'').trim();
  report.before={id:ID,code:mf5.code,description:before};
  // Only fill empty or correct the malformed "200.000 nghìn" legacy phrase.
  // Preserve other merchant-authored wording and all commercial settings.
  if(!before||/200[.,]000\s*nghìn/i.test(before)){
    await rest('PUT','/wp-json/wc/v3/coupons/'+ID,{description:DESCRIPTION});
    report.changed=1;
  }else{
    report.skipped_unchanged=1;
  }
  const current=await rest('GET','/wp-json/wc/v3/coupons/'+ID);
  assert(current.id===ID&&String(current.code).toLowerCase()==='mf5','Readback identity mismatch');
  assert(current.discount_type==='percent'&&Number(current.amount)===5&&Number(current.minimum_amount)===200001,'Unexpected commercial change');
  assert(String(current.description||'').trim()=== (report.changed?DESCRIPTION:before),'Description not persisted');
  report.after={id:current.id,code:current.code,description:current.description,amount:current.amount,minimum:current.minimum_amount};
  const mf10=await rest('GET','/wp-json/wc/v3/coupons?code=mf10&per_page=100');
  report.mf10={published_count:Array.isArray(mf10)?mf10.filter(c=>c.code==='mf10'&&c.status==='publish').length:null,action:'READ_ONLY_NO_RECREATE'};
  report.status='PASS';save();
  console.log('AQUA_MF5_DESCRIPTION_PASS='+JSON.stringify(report));
 } finally {await browser.close();}
})().catch(e=>{
 report.status='FAIL';report.error=String(e.message||e).slice(0,350);save();
 console.error('AQUA_MF5_DESCRIPTION_FAIL='+report.error);process.exitCode=1;
});
