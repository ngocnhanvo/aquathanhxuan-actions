const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base='https://admin.aquathanhxuan.io.vn';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto(base+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
    await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
    await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
    await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:30000});
  await page.goto(base+'/wp-admin/edit-tags.php?taxonomy=product_cat&post_type=product',{waitUntil:'domcontentloaded',timeout:60000});
  const report=await page.evaluate(async()=>{
    const options=[...document.querySelectorAll('#parent option')].map(el=>({
      id:el.value,name:el.textContent.trim()
    }));
    const rows=[...document.querySelectorAll('#the-list tr')].map(tr=>({
      id:tr.id,
      name:tr.querySelector('.row-title')?.textContent?.trim(),
      slug:tr.querySelector('.column-slug')?.textContent?.trim(),
      count:tr.querySelector('.column-posts')?.textContent?.trim(),
    })).filter(x=>x.name);
    const urls=['/wp-json/api/products/categories','/wp-json/wp/v2/product_cat?per_page=100',
      '/wp-json/wc/store/v1/products/categories?per_page=100'];
    const rest={};
    for(const url of urls)try{
      const r=await fetch(url,{credentials:'same-origin'});
      const json=await r.json();
      rest[url]={status:r.status,data:Array.isArray(json)?json.map(x=>({
        id:x.id,name:x.name,slug:x.slug,parent:x.parent,count:x.count,
        children:Array.isArray(x.children)?x.children.map(y=>({
          id:y.id,name:y.name,slug:y.slug,parent:y.parent,count:y.count,
          children:Array.isArray(y.children)?y.children.map(z=>({id:z.id,name:z.name,slug:z.slug,count:z.count})):undefined
        })):undefined
      })):json?.message||null};
    }catch(error){rest[url]={error:String(error)}}
    const productResponse=await fetch('/wp-json/wp/v2/product?status=publish&per_page=100',{credentials:'same-origin'});
    const productJson=await productResponse.json();
    const products={status:productResponse.status,items:Array.isArray(productJson)?productJson.map(x=>({
      id:x.id,name:x.title?.rendered,slug:x.slug,
      product_cat:x.product_cat,categories:x.categories,
      acfCategory:x.acf?.category,
      categoryNames:x.product_categories
    })):productJson?.message};
    return {title:document.title,options,rows,rest,products};
  });
  console.log('CATEGORY_INVENTORY='+JSON.stringify(report));
  assert(report.options.length>0,'Category management parent dropdown absent');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
