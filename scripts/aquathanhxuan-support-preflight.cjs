'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const host='https://admin.aquathanhxuan.io.vn';
const slugs=['chinh-sach-doi-tra-hang','gioi-thieu','dai-ly','khieu-nai','lien-he'];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 try{
  assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'CMS credentials unavailable');
  await page.goto(host+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const origin=await page.request.get(host+'/wp-json/wp/v2/pages?per_page=100&status=publish&_fields=id,slug,title,acf,link',{timeout:30000});
  assert.equal(origin.status(),200,'Public WP Pages REST missing');
  const items=await origin.json();
  const sample=items.filter(x=>x.acf?.action).slice(0,5).map(x=>({id:x.id,slug:x.slug,acf:{action:x.acf.action,key:x.acf.key,product_lang:x.acf.product_lang}}));
  const requested=items.filter(x=>slugs.includes(x.slug)).map(x=>({id:x.id,slug:x.slug,acf:{action:x.acf?.action,key:x.acf?.key}}));
  console.log('SUPPORT_PUBLIC_PAGES='+JSON.stringify({existing:requested,sample}));
  const table=await page.request.get(host+'/wp-json/tablepress/v1/table/pub_aquafooterlinks',{timeout:30000});
  console.log('SUPPORT_FOOTER_TABLE='+JSON.stringify({status:table.status(),items:table.ok()?(await table.json()).items?.filter(i=>i.group==='support'):null}));
  await page.goto(host+'/wp-admin/post-new.php?post_type=page',{waitUntil:'domcontentloaded',timeout:45000});
  const controls=await page.evaluate(()=>({
   location:location.pathname,
   titleInput:!!document.querySelector('#title'),
   contentInput:!!document.querySelector('#content'),
   publishInput:!!document.querySelector('#publish'),
   acf:[...document.querySelectorAll('[data-name]')].filter(x=>['action','key','product_lang','cssmore'].includes(x.getAttribute('data-name'))).map(x=>({
    dataName:x.getAttribute('data-name'),
    dataKey:x.getAttribute('data-key'),
    inputNames:[...x.querySelectorAll('input,select,textarea')].map(n=>n.getAttribute('name')).filter(Boolean).slice(0,5),
    inputTypes:[...x.querySelectorAll('input,select,textarea')].map(n=>n.type||n.tagName).slice(0,5),
   })),
   restNonceAvailable:!!window.wpApiSettings?.nonce,
   restNonceMeta:!!document.querySelector('meta[name=wp-api-nonce]'),
   publishBox:document.querySelector('#post_status')?.value,
  }));
  console.log('SUPPORT_PAGE_EDITOR='+JSON.stringify(controls));
 }catch(e){console.error('SUPPORT_PREFLIGHT_FAIL='+e.stack);process.exitCode=1;}
 finally{await browser.close()}
})().catch(e=>{console.error('SUPPORT_PREFLIGHT_FATAL='+e.stack);process.exitCode=1;});
