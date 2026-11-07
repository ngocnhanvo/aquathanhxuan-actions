import { chromium } from 'playwright';
const base='https://admin.aquathanhxuan.io.vn';
const desired=[
 ['Thương hiệu','thuong-hieu'],['Đèn','den'],['Máy lọc','may-loc'],
 ['Vật liệu lọc','vat-lieu-loc'],['Phụ kiện','phu-kien'],['Đá / Lũa / Cát','da-lua-va-cat'],
 ['Hóa chất','thuoc-xu-ly-van-de'],['Bể kính','be-kinh-va-chan'],
 ['Nền','nen-cho-be-thuy-sinh'],['CO2','co2'],['Sinh vật','cay-va-ca-thuy-sinh']
];
const http=async path=>{
 const r=await fetch(base+path,{signal:AbortSignal.timeout(15000),headers:{'cache-control':'no-cache'}});
 if(!r.ok)throw Error('REST '+path+' HTTP '+r.status);
 return r.json();
};
const getCats=()=>http('/wp-json/astro/v1/get-product-categories?_ts='+Date.now());
const getPages=()=>http('/wp-json/wp/v2/pages?status=publish&per_page=100&_fields=id,slug,acf,title');
const getMenus=()=>http('/wp-json/esc-api/v1/menus?_ts='+Date.now());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let [cats,pages,menus]=await Promise.all([getCats(),getPages(),getMenus()]);
 const existingPage=pages.find(p=>p.acf?.key==='ssr-products'&& (p.acf?.product_lang?.value||p.acf?.product_lang)==='vi');
 const existingMenu=menus?.menus?.Header?.vi;
 const target={};
 if(existingPage){
  if(existingPage.slug!=='san-pham'||existingPage.acf?.action!=='ProductsSSRPage')throw Error('EXISTING_PRODUCTS_PAGE_MISMATCH '+JSON.stringify({id:existingPage.id,slug:existingPage.slug,action:existingPage.acf?.action}));
  target.page=existingPage;
 }
 const missing=desired.filter(([label,slug])=>!cats.some(c=>c.slug===slug));
 console.log('PREFLIGHT='+JSON.stringify({categories:cats.map(c=>({id:c.id,name:c.name,slug:c.slug})),missing:missing.length,product_page:target.page?.id||null,header_items:existingMenu?.items?.length||0}));
 if(missing.length===0&&target.page&&existingMenu?.items?.length===desired.length){
  const correct=existingMenu.items.every((item,i)=>item.label===desired[i][0]&&String(item.slug).replace(/^\\/+/,'')==='san-pham/'+desired[i][1]);
  if(correct){console.log('AQUA_MENU_SETUP=PASS SKIP_UNCHANGED');process.exit(0);}
 }
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:950}});
 await page.goto(base+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:30000});
 if(await page.locator('#user_login').count()){
  await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
  await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
  await Promise.all([page.waitForURL(/wp-admin/, {timeout:30000}),page.locator('#wp-submit').click()]);
 }
 if(!page.url().includes('/wp-admin/'))throw Error('WORDPRESS_LOGIN_FAILED');
 if(!target.page){
  await page.goto(base+'/wp-admin/post-new.php?post_type=page',{waitUntil:'domcontentloaded',timeout:30000});
  const actionInput=page.locator('.acf-field[data-name="action"] input[type="text"]');
  const keyInput=page.locator('.acf-field[data-name="key"] input[type="text"]');
  const langInput=page.locator('.acf-field[data-name="product_lang"] select');
  const info={action:await actionInput.count(),key:await keyInput.count(),lang:await langInput.count()};
  if(!info.action||!info.key||!info.lang)throw Error('ACF_PAGE_FIELDS_NOT_FOUND '+JSON.stringify(info));
  await page.locator('#title').fill('Sản phẩm');
  await actionInput.fill('ProductsSSRPage');
  await keyInput.fill('ssr-products');
  await langInput.selectOption('vi');
  await page.locator('#publish').click();
  await page.waitForURL(/post\.php\?post=\d+&action=edit/, {timeout:30000});
  pages=await getPages();
  target.page=pages.find(p=>p.acf?.key==='ssr-products'&&(p.acf?.product_lang?.value||p.acf?.product_lang)==='vi');
  if(!target.page||target.page.slug!=='san-pham'||target.page.acf?.action!=='ProductsSSRPage')throw Error('SSR_PAGE_VERIFY_FAILED '+JSON.stringify({page:target.page?.id,slug:target.page?.slug,action:target.page?.acf?.action}));
  console.log('SSR_PAGE_CREATED='+target.page.id);
 }
 if(missing.length){
  await page.goto(base+'/wp-admin/edit-tags.php?taxonomy=product_cat&post_type=product',{waitUntil:'domcontentloaded',timeout:30000});
  for(const [label,slug] of missing){
   cats=await getCats();
   if(cats.some(c=>c.slug===slug)){console.log('CATEGORY_SKIPPED='+slug);continue;}
   await page.locator('#tag-name').fill(label);
   await page.locator('#tag-slug').fill(slug);
   await page.locator('#submit').click();
   let found=false;
   for(let attempt=0;attempt<6;attempt++){
    await sleep(700);
    cats=await getCats();
    if(cats.some(c=>c.slug===slug)){found=true;break;}
   }
   if(!found)throw Error('CATEGORY_CREATE_FAILED '+slug);
   console.log('CATEGORY_CREATED='+slug);
  }
 }
 cats=await getCats();
 for(const [label,slug] of desired){if(!cats.some(c=>c.slug===slug))throw Error('CATEGORY_MISSING '+label+' '+slug);}
 const menuUrl=base+'/wp-admin/nav-menus.php';
 await page.goto(menuUrl,{waitUntil:'domcontentloaded',timeout:30000});
 let menuId=0;
 const selector=page.locator('#select-menu-to-edit');
 if(await selector.count()){
  const ids=await selector.locator('option').evaluateAll(els=>els.map(e=>Number(e.value)).filter(x=>Number.isSafeInteger(x)&&x>0));
  for(const id of ids){
   await page.goto(menuUrl+'?action=edit&menu='+id,{waitUntil:'domcontentloaded',timeout:30000});
   const code=await page.locator('#esc-menu-code').inputValue().catch(()=>null);
   const lang=await page.locator('#esc-menu-lang').inputValue().catch(()=>null);
   if(String(code).toLowerCase()==='header'&&lang==='vi'){menuId=id;break;}
  }
 }
 if(!menuId){
  await page.goto(menuUrl+'?action=edit&menu=0',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#menu-name').fill('Header VI');
  await Promise.all([page.waitForURL(/nav-menus\.php.*menu=\d+/, {timeout:30000}),page.locator('#save_menu_header').click()]);
  menuId=Number(new URL(page.url()).searchParams.get('menu'));
  if(!menuId)throw Error('MENU_CREATE_FAILED');
 }
 await page.goto(menuUrl+'?action=edit&menu='+menuId,{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#esc-menu-code').fill('Header');
 await page.locator('#esc-menu-lang').selectOption('vi');
 await page.locator('#esc-menu-type').selectOption('dropdown');
 await page.locator('#save_menu_header').click();
 const tree=desired.map(([label,slug])=>({key:'menu-'+slug,lang:'vi',label,slug:'/san-pham/'+slug,linkMode:'custom'}));
 await page.locator('#esc-pse-menu-json-input').fill(JSON.stringify(tree));
 await page.locator('#esc-pse-menu-json-preview').click();
 const preview=String(await page.locator('#esc-pse-menu-json-result').textContent());
 if(!preview.includes('11 items hợp lệ'))throw Error('MENU_PREVIEW_FAILED '+preview.slice(0,280));
 page.once('dialog',d=>d.accept());
 await page.locator('#esc-pse-menu-json-replace').click();
 menus=await getMenus();
 const actual=menus?.menus?.Header?.vi?.items;
 if(!Array.isArray(actual)||actual.length!==11)throw Error('MENU_VERIFY_COUNT '+actual?.length);
 for(let i=0;i<11;i++)if(actual[i]?.label!==desired[i][0]||String(actual[i]?.slug||'').replace(/^\\/+/,'')!=='san-pham/'+desired[i][1])throw Error('MENU_VERIFY_ITEM '+i+' '+JSON.stringify(actual[i]));
 console.log('AQUA_MENU_SETUP=PASS menu_id='+menuId+' items=11 page_id='+target.page.id);
}finally{await browser?.close().catch(()=>{});}
