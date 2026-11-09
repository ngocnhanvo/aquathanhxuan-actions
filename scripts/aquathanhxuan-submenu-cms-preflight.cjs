const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='https://admin.aquathanhxuan.io.vn';
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing configured WP admin');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(base+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const token=await page.request.get(base+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(token.status(),200,'REST nonce unavailable');
  const nonce=(await token.text()).trim();
  assert(nonce,'REST nonce empty');
  const headers={'X-WP-Nonce':nonce,'Accept':'application/json'};
  const urls=[
   '/wp-json/wp/v2/menus/1778?context=edit',
   '/wp-json/wp/v2/menu-items?context=edit&menus=1778&per_page=100',
   '/wp-json/wp/v2/product_cat?per_page=20',
   '/wp-json/esc-api/v1/menus'
  ];
  for(const url of urls){
   const res=await page.request.get(base+url,{headers,timeout:15000});
   const body=await res.text();
   let parsed;try{parsed=JSON.parse(body)}catch{parsed=null}
   console.log('SUBMENU_PREFLIGHT_ENDPOINT='+JSON.stringify({
    path:url,status:res.status(),count:Array.isArray(parsed)?parsed.length:null,
    keys:parsed&&!Array.isArray(parsed)?Object.keys(parsed).slice(0,14):[],
    example:Array.isArray(parsed)?parsed.slice(0,2).map(x=>({
      id:x.id,title:x.title,type:x.type,parent:x.parent,menus:x.menus,url:x.url
    })):null,
    error:!res.ok()?body.slice(0,180):null
   }));
  }
  await page.goto(base+'/wp-admin/edit-tags.php?taxonomy=product_cat&post_type=product',{waitUntil:'domcontentloaded',timeout:50000});
  console.log('SUBMENU_PREFLIGHT_CATEGORY_FORM='+JSON.stringify({
   title:await page.title(),
   tagName:await page.locator('#tag-name').count(),
   tagSlug:await page.locator('#tag-slug').count(),
   tagParent:await page.locator('#parent').count(),
   tagSubmit:await page.locator('#submit').count()
  }));
  console.log('SUBMENU_CMS_PREFLIGHT_PASS=1');
 }finally{await browser.close()}
})().catch(e=>{console.error('SUBMENU_CMS_PREFLIGHT_FAILED '+(e.stack||e.message));process.exitCode=1});
