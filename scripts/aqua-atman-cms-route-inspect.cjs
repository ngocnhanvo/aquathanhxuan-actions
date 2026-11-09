'use strict';
const {chromium}=require('playwright');
const wp='https://admin.aquathanhxuan.io.vn';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 try{
  await page.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nonceR=await page.request.get(wp+'/wp-admin/admin-ajax.php?action=rest-nonce');
  const nonce=nonceR.ok()?(await nonceR.text()).trim():'';
  const headers={'X-WP-Nonce':nonce,'Cache-Control':'no-cache'};
  for(const url of [
   '/wp-json/wp/v2/types',
   '/wp-json/wp/v2/chuyen-huong-link?context=edit&per_page=100&status=any',
   '/wp-json/wp/v2/chuyen-huong-link?context=edit&per_page=100&status=publish',
   '/wp-json/astro/v1/get-redirects'
  ]){
   try{
   const resp=await page.request.get(wp+url,{headers,timeout:30000});
   const raw=await resp.text();
   const parsed=JSON.parse(raw);
   const rows=Array.isArray(parsed)?parsed:[];
   console.log('ATMAN_ROUTE_CMS='+JSON.stringify({url,status:resp.status(),total:resp.headers()['x-wp-total']||null,
     data:url==='/wp-json/wp/v2/types'?Object.keys(parsed):rows.map(x=>({id:x.id,title:x.title,slug:x.slug,status:x.status,acf:x.acf,priority:x.route_priority,conditions:x.route_conditions})).slice(0,150)
   }).slice(0,38000));
   }catch(e){console.log('ATMAN_ROUTE_CMS_ERROR='+JSON.stringify({url,error:String(e).slice(0,220)}))}
  }
  await page.goto(wp+'/wp-admin/edit.php?post_type=chuyen-huong-link',{waitUntil:'domcontentloaded',timeout:45000});
  const admin=await page.evaluate(()=>({
    url:location.href,title:document.title,
    rows:[...document.querySelectorAll('#the-list tr')].slice(0,100).map(x=>({id:x.id,title:x.querySelector('.row-title')?.textContent?.trim(),href:x.querySelector('.row-title')?.getAttribute('href')})),
    err:document.querySelector('.notice-error')?.textContent?.trim()?.slice(0,500)
  }));
  console.log('ATMAN_ROUTE_CMS_ADMIN='+JSON.stringify(admin).slice(0,15000));
  await page.goto(wp+'/wp-admin/post-new.php?post_type=chuyen-huong-link',{waitUntil:'domcontentloaded',timeout:45000});
  const fieldInfo=await page.evaluate(()=>({
    url:location.href,title:document.title,
    fields:[...document.querySelectorAll('[data-name]')].filter(x=>x.querySelector('input,select,textarea'))
      .map(node=>({
       name:node.getAttribute('data-name'),key:node.getAttribute('data-key'),label:node.querySelector('.acf-label label')?.textContent?.trim(),
       inputs:[...node.querySelectorAll('input,select,textarea')].slice(0,10).map(el=>({
         name:el.getAttribute('name'),type:el.getAttribute('type'),value:el.value,
         options:el.tagName==='SELECT'?[...el.options].map(o=>({value:o.value,text:o.textContent?.trim()})):undefined
       }))
      })).slice(0,70),
    publishButton:document.querySelector('#publish')?.textContent,
    error:document.querySelector('.notice-error')?.textContent?.trim()?.slice(0,700)
  }));
  console.log('ATMAN_ROUTE_CMS_EDITOR='+JSON.stringify(fieldInfo).slice(0,30000));
 }finally{await browser.close()}
})().catch(e=>{console.error('ATMAN_ROUTE_CMS_INSPECT_FAIL='+e.stack);process.exitCode=1});
