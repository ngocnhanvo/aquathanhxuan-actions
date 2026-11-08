'use strict';
/** Read-only inventory of Home Page and actual WooCommerce categories/products. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const HOME=82454;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 try{
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:55000});
  if(await page.locator('#user_login').count()){
   assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WP admin credentials missing');
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const get=async path=>{
   const response=await page.request.get(WP+path,{timeout:35000,failOnStatusCode:false});
   let json=null; try{json=await response.json()}catch{}
   return {status:response.status(),json,headers:response.headers()};
  };
  const entry=await get('/wp-json/wp/v2/pages/'+HOME+'?context=edit');
  const plain=entry.json?.content?.raw||entry.json?.content?.rendered||'';
  const matches=[...plain.matchAll(/\\[table\\s+id=['"]?([a-zA-Z0-9_-]+)/g)].map(m=>m[1]);
  console.log('EQUIP_PAGE='+JSON.stringify({http:entry.status,page:HOME,shortcodes:matches}));
  const rawcats=[];
  for(let i=1;i<=6;i++){
   const r=await get('/wp-json/wp/v2/product_cat?per_page=100&hide_empty=false&page='+i);
   if(r.status!==200||!Array.isArray(r.json)){if(i===1)throw new Error('No product_cat REST: '+r.status);break}
   rawcats.push(...r.json.map(c=>({id:c.id,name:c.name,slug:c.slug,parent:c.parent,count:c.count})));
   if(r.json.length<100)break;
  }
  const matching=rawcats.filter(c=>/máy lọc|may loc|đèn|den|filter|lighting|sunsun|jebao|atman|kaokui|odyssea|chihiros|weekaqua|neo helios|loc phu|lọc phụ|lọc váng/i.test(c.name+' '+c.slug));
  const roots=rawcats.filter(c=>/^(máy lọc|đèn)$/i.test(c.name.trim())||/^(may-loc|den|den-thuy-sinh)$/.test(c.slug));
  console.log('EQUIP_CATEGORY_INVENTORY='+JSON.stringify({total:rawcats.length,roots,related:matching.slice(0,80),rootChildren:roots.map(r=>({root:r,children:rawcats.filter(c=>c.parent===r.id)}))}));
  const products=new Map();
  const terms=['Lọc treo Sunsun YBG','Jebao XP-05','Sunsun YBF','Sunsun XWA','Đèn Led UFO BAO YOU','Đèn A60-80W','ĐÈN KAOKUI 70W','COCO FA','Rọi Coco Spotlight','Hanging Kits','Đèn thủy sinh'];
  for(const term of terms){
   const res=await get('/wp-json/wc/store/v1/products?per_page=50&search='+encodeURIComponent(term));
   if(res.status===200&&Array.isArray(res.json)){
    for(const p of res.json)products.set(String(p.id),{id:p.id,name:p.name,slug:p.slug,categories:(p.categories||[]).map(x=>({id:x.id,name:x.name,slug:x.slug})),price:p.prices?.price,thumbnail:p.images?.[0]?.src||''});
   }
   console.log('EQUIP_SEARCH='+JSON.stringify({term,http:res.status,found:Array.isArray(res.json)?res.json.length:-1}));
  }
  console.log('EQUIP_PRODUCTS='+JSON.stringify([...products.values()].slice(0,100)));
  for(const id of ['home_02','home_02products','home_06','home_06products','home_07','home_07products']){
   const r=await get('/wp-json/tablepress/v1/table/'+id);
   console.log('EQUIP_TABLE='+JSON.stringify({id,status:r.status,meta:r.json?.meta,items:Array.isArray(r.json?.items)?r.json.items.slice(0,4):null}));
  }
  console.log('EQUIP_INVENTORY_PASS');
 }finally{await browser.close()}
})().catch(e=>{console.error('EQUIP_INVENTORY_FAIL='+e.stack);process.exitCode=1});
