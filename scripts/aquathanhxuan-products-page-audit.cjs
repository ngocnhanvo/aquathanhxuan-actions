const {chromium}=require('playwright');
const fs=require('node:fs');
const WP='https://admin.aquathanhxuan.io.vn';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const report={published:[],adminRows:[],acfFields:[]};
 try{
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded'});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:40000});
  for(let index=1;index<=10;index++){
   const r=await page.request.get(WP+'/wp-json/wp/v2/pages?status=publish&per_page=100&page='+index+
     '&_fields=id,slug,title,status,acf,link,parent',{timeout:30000});
   if(r.status()===400)break;
   if(r.status()!==200)throw Error('Cannot read WP pages HTTP '+r.status());
   const rows=await r.json();
   if(!Array.isArray(rows))throw Error('Invalid pages JSON');
   report.published.push(...rows.map(x=>({id:x.id,slug:x.slug,title:x.title?.rendered,
    parent:x.parent,status:x.status,link:x.link,key:x.acf?.key,action:x.acf?.action,
    locale:x.acf?.product_lang?.value||x.acf?.product_lang||null})));
   if(rows.length<100)break;
  }
  await page.goto(WP+'/wp-admin/edit.php?post_type=page&post_status=all',{waitUntil:'domcontentloaded'});
  report.adminRows=await page.locator('#the-list tr[id^="post-"]').evaluateAll(nodes=>
   nodes.map(n=>({id:n.id,title:n.querySelector('.row-title')?.textContent?.trim()||'',
    edit:n.querySelector('.row-title')?.getAttribute('href')||'',
    status:n.querySelector('.post-state')?.textContent?.trim()||''})));
  await page.goto(WP+'/wp-admin/post.php?post=82454&action=edit&esc_full_admin=1',
    {waitUntil:'domcontentloaded'});
  report.acfFields=await page.locator('[data-name="key"],[data-name="action"],[data-name="product_lang"]').evaluateAll(nodes=>
   nodes.map(n=>({name:n.getAttribute('data-name'),input:n.querySelector('input,select')?.getAttribute('name'),
    value:n.querySelector('input,select')?.value||'',
    options:[...n.querySelectorAll('option')].map(x=>({value:x.value,label:x.textContent?.trim()})).slice(0,100)})));
  fs.mkdirSync('chatgpt',{recursive:true});
  fs.writeFileSync('chatgpt/home02products-page-inventory.json',JSON.stringify(report,null,2)+'\n');
  console.log('PRODUCTS_PAGE_INVENTORY='+JSON.stringify({pages:report.published.length,
    candidates:report.published.filter(x=>/product|san-pham|sản phẩm|shop/i.test(x.key+' '+x.slug+' '+x.title+' '+x.action)),
    acfFields:report.acfFields}).slice(0,12500));
 }finally{await browser.close()}
})().catch(e=>{console.error('PRODUCTS_PAGE_AUDIT_FAIL='+String(e));process.exitCode=1});
