'use strict';
/** Scope: two permanent CMS Page records for password recovery. No user or email writes. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const OUT='artifacts/aqua-password-recovery-pages';
fs.mkdirSync(OUT,{recursive:true});
const expected=[
  {slug:'quen-mat-khau',title:'Quên mật khẩu',key:'lostpass',action:'LostPassPage'},
  {slug:'dat-lai-mat-khau',title:'Đặt lại mật khẩu',key:'resetpass',action:'ResetPassPage'}
];
const report={scope:'ONLY TWO WordPress Pages, no customer/order/email write',created:[],verified:[],status:'STARTED'};
const save=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(report,null,2)+'\n');
(async()=>{
  assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WordPress admin secrets required');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  let request,headers;
  try {
    const page=await browser.newPage();
    await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:50000});
    if(await page.locator('#user_login').count()){
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
    request=page.request;
    const nr=await request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:15000});
    assert.equal(nr.status(),200,'Could not obtain WP REST nonce');
    headers={'X-WP-Nonce':(await nr.text()).trim()};
    const read=async(path)=>{
      const r=await request.get(WP+path,{headers,timeout:30000});
      assert(r.ok(),'WP GET failed '+r.status()+' '+path);
      return r.json();
    };
    const write=async(path,body)=>{
      const r=await request.post(WP+path,{headers:{...headers,'Content-Type':'application/json'},data:body,timeout:40000});
      const data=await r.text();
      assert(r.ok(),'WP POST failed '+r.status()+' '+path+' '+data.slice(0,200));
      return JSON.parse(data);
    };
    // Check all Page statuses so existing records are not overwritten or duplicated.
    const all=[];
    for(let n=1;n<=30;n++){
      const r=await request.get(WP+'/wp-json/wp/v2/pages?status=any&context=edit&per_page=100&page='+n,{headers,timeout:30000});
      if(r.status()===400)break;
      assert.equal(r.status(),200,'WP Page inventory failed');
      const part=await r.json();assert(Array.isArray(part),'Page inventory shape');
      all.push(...part);
      if(part.length<100)break;
    }
    for(const spec of expected){
      const matches=all.filter(p=>p.slug===spec.slug || p.acf?.key===spec.key || p.acf?.action===spec.action);
      assert(matches.length<=1,'Ambiguous Page slug, key or action '+spec.slug);
      let item=matches[0];
      if(item){
        assert.equal(item.slug,spec.slug,'Existing Page has different slug');
        assert.equal(item.acf?.key,spec.key,'Existing Page has different key');
        assert.equal(item.acf?.action,spec.action,'Existing Page has different action');
        assert.equal(item.status,'publish','Existing Page unpublished; refusing to change it');
      }else{
        item=await write('/wp-json/wp/v2/pages',{
          title:spec.title,slug:spec.slug,status:'draft',
          acf:{key:spec.key,action:spec.action,product_lang:'vi'}
        });
        report.created.push({id:item.id,slug:spec.slug,stage:'draft-created'});save();
        const before=await read('/wp-json/wp/v2/pages/'+item.id+'?context=edit');
        assert.equal(before.slug,spec.slug);
        assert.equal(before.acf?.key,spec.key);
        assert.equal(before.acf?.action,spec.action);
        await write('/wp-json/wp/v2/pages/'+item.id,{status:'publish'});
        report.created[report.created.length-1].stage='published';save();
      }
      const got=await read('/wp-json/wp/v2/pages/'+item.id+'?context=edit');
      assert.equal(got.status,'publish');
      assert.equal(got.slug,spec.slug);
      assert.equal(got.acf?.key,spec.key);
      assert.equal(got.acf?.action,spec.action);
      assert.equal(got.acf?.product_lang?.value||got.acf?.product_lang,'vi');
      report.verified.push({id:got.id,slug:got.slug,key:got.acf?.key,action:got.acf?.action});
      save();
    }
    report.status='PASS';save();
    console.log('AQUA_PASSWORD_RECOVERY_CMS_PASS='+JSON.stringify({pages:report.verified,created:report.created.length}));
  }finally{await browser.close();}
})().catch(e=>{report.status='FAIL';report.error=String(e.message||e).slice(0,450);save();console.error('AQUA_PASSWORD_RECOVERY_CMS_FAIL='+report.error);process.exitCode=1;});
