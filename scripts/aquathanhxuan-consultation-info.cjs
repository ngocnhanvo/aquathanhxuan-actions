// Narrow, guarded CMS enrichment for public legacy support channels.
// Only writes previously EMPTY ACF fields on the verified Info record.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const wp='https://admin.aquathanhxuan.io.vn';
const id=62;
const expected={
  facebook:'https://www.facebook.com/aquathanhxuan.hn/',
  zalo:'0972551688',
  motaseo:'Chúng tôi đáp ứng mọi nhu cầu cho bể cá của bạn.'
};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 try{
   assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WP credentials missing');
   await page.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
   if(await page.locator('#user_login').count()){
     await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
     await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
     await page.locator('#wp-submit').click();
   }
   await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
   await page.goto(wp+'/wp-admin/post.php?post='+id+'&action=edit',{waitUntil:'domcontentloaded',timeout:45000});
   const result=await page.evaluate(async ({id,expected})=>{
     const nonce=window.wpApiSettings?.nonce || '';
     if(!nonce) return {error:'WP_REST_NONCE_UNAVAILABLE',wpApi:typeof window.wpApiSettings};
     const headers={'X-WP-Nonce':nonce,'Content-Type':'application/json'};
     const endpoint='/wp-json/wp/v2/thong-tin-chung/'+id;
     const read=async()=>{
       const res=await fetch(endpoint+'?context=edit',{headers,credentials:'same-origin'});
       if(!res.ok) throw Error('WP_INFO_GET_HTTP_'+res.status);
       return res.json();
     };
     const before=await read();
     if(before.id!==id || before.type!=='thong-tin-chung' ||
        !String(before.acf?.diachihanoi||'').includes('Lương Ngọc Quyến') ||
        !String(before.acf?.hotline||'').includes('0972551688')) {
       throw Error('WP_INFO_IDENTITY_MISMATCH');
     }
     const changes={};
     const same={};
     for(const [field,value] of Object.entries(expected)){
       const old=String(before.acf?.[field]||'').trim();
       if(old && old!==value) throw Error('WP_INFO_FIELD_CONFLICT_'+field);
       if(!old) changes[field]=value;
       else same[field]=true;
     }
     if(Object.keys(changes).length){
       const res=await fetch(endpoint,{method:'POST',headers,credentials:'same-origin',
         body:JSON.stringify({acf:changes})});
       if(!res.ok) throw Error('WP_INFO_UPDATE_HTTP_'+res.status);
     }
     const after=await read();
     for(const [field,value] of Object.entries(expected)) {
       if(String(after.acf?.[field]||'').trim()!==value)
         throw Error('WP_INFO_READBACK_MISMATCH_'+field);
     }
     return {ok:true,changed:Object.keys(changes),skipped_unchanged:Object.keys(same)};
   },{id,expected});
   if(result.error) throw Error(result.error);
   assert.equal(result.ok,true);
   console.log('AQUA_CONSULTATION_CMS_PASS='+JSON.stringify(result));
 }catch(error){
   console.error('AQUA_CONSULTATION_CMS_FAIL='+error.message);
   process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error('AQUA_CONSULTATION_CMS_FATAL='+e.message);process.exitCode=1;});
