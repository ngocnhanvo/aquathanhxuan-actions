'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin='https://aquathanhxuan.com';
const api=async (path)=>{
  const r=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});
  const t=await r.text();
  if(!r.ok)throw Error(path+' HTTP '+r.status+' '+t.slice(0,160));
  return {rows:JSON.parse(t),total:r.headers.get('x-wp-total'),pages:r.headers.get('x-wp-totalpages')};
};
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();
  try{
    await page.goto(origin+'/danh-muc/thuong-hieu/atman/',{waitUntil:'domcontentloaded',timeout:60000});
    const links=await page.locator('a[href*="/san-pham/"]').evaluateAll(nodes=>nodes.map(n=>({url:n.href,title:(n.textContent||'').trim()})).filter(x=>x.title&&x.url.startsWith('https://aquathanhxuan.com/san-pham/')));
    const unique=[...new Map(links.map(x=>[x.url,x])).values()];
    console.log('ATMAN_LEGACY_PRODUCT_LINKS='+JSON.stringify(unique).slice(0,12000));
    const categories=[];
    for(let p=1;p<=5;p++){
      const r=await api('/wp-json/wc/store/v1/products/categories?per_page=100&page='+p);
      assert(Array.isArray(r.rows),'Invalid source category payload');
      categories.push(...r.rows);
      if(r.rows.length<100)break;
    }
    const atman=categories.filter(c=>/atman/i.test(c.name||'')||/atman/i.test(c.slug||''));
    const brands=categories.filter(c=>/thương hiệu|thuong hieu/i.test(c.name||''));
    console.log('ATMAN_LEGACY_CATEGORIES='+JSON.stringify({atman,brands,count:categories.length}).slice(0,6000));
    const targetCategory=atman.find(c=>brands.some(x=>Number(x.id)===Number(c.parent)))||atman.find(c=>c.slug==='atman');
    if(!targetCategory)throw Error('Atman category not resolvable from source API');
    const all=[];
    for(let p=1;p<=10;p++){
      const r=await api('/wp-json/wc/store/v1/products?per_page=100&category='+targetCategory.id+'&page='+p);
      assert(Array.isArray(r.rows),'Invalid source products payload');
      all.push(...r.rows.map(x=>({id:x.id,name:x.name,slug:x.slug,status:x.status,price:x.prices?.price,regular_price:x.prices?.regular_price,image:x.images?.[0]?.src,date:x.date_created,categories:x.categories})));
      if(r.rows.length<100)break;
    }
    console.log('ATMAN_SOURCE_PRODUCTS='+JSON.stringify({category:targetCategory,count:all.length,products:all}).slice(0,18000));
  }finally{await browser.close()}
})().catch(e=>{console.error('ATMAN_SOURCE_INVENTORY_FAIL='+e.stack);process.exitCode=1});
