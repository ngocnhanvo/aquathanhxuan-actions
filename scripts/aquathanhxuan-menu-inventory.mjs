import {chromium} from 'playwright';
const base='https://admin.aquathanhxuan.io.vn';
let browser;
try {
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.goto(base+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
 await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
 await Promise.all([page.waitForURL(/wp-admin/, {timeout:30000}),page.locator('#wp-submit').click()]);
 for(const [name,path] of Object.entries({pages:'/wp-admin/post-new.php?post_type=page',categories:'/wp-admin/edit-tags.php?taxonomy=product_cat&post_type=product',menus:'/wp-admin/nav-menus.php'})){
  await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:30000});
  const fields=await page.locator('input,select,textarea,button').evaluateAll(els=>els.filter(e=>!['hidden','password'].includes(e.type)).slice(0,120).map(e=>({tag:e.tagName,id:e.id,name:e.name,type:e.type,text:(e.textContent||'').trim().slice(0,70)})));
  console.log('AQUA_ADMIN_FORM_'+name.toUpperCase()+'='+JSON.stringify({url:page.url(),fields}));
 }
}finally{await browser?.close();}
