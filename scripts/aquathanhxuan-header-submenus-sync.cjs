const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const wp='https://admin.aquathanhxuan.io.vn',menuId=1778;
const source=[
 ['thuong-hieu','Thương hiệu','ATMAN:atman|CHIHIROS:chihiros|CONTINUUM AQUATICS:continuum-aquatics|DENNERLE:dennerle|EHEIM:eheim|ISTA:ista|FKSC:may-loc-fksc|MOUTAIN TREE:moutaintree|MUFAN:jbl|NEO:neo|NUPHAR:nuphar|SEACHEM:seachem|JEBAO:jebao|JECOD:jecod-thuong-hieu|PRODAC ITALIA:prodac-italia|GEX:gex|PRODIBIO:prodibio|SERA:sera|SOBO:sobo|WEEK AQUA:week-aqua'],
 ['den','Đèn','WeekAqua:den-weekaqua|Chihiros:den-chihiros|Neo Helios:neo-helios|Xuanmailong:xuanmailong|Kaokui:kaokui|Odyssea:odyssea|Phụ kiện đèn:phu-kien-do-thay-the-den'],
 ['may-loc','Máy lọc','Atman:may-loc-atman|Jebao:jebao-may-loc|Sunsun:may-loc-sunsun|Eheim:may-loc-eheim|Lọc váng:loc-vang|Lọc treo:loc-phu|Lọc vi sinh:may-loc-vi-sinh|Phụ kiện máy lọc:phu-kien-do-thay-the-may-loc'],
 ['vat-lieu-loc','Vật liệu lọc','Seachem:vat-lieu-loc-seachem|Continuum:vll-continuum|Moutain Tree:moutain-tree|Sứ lọc:su-loc|Túi đựng vật liệu lọc:tui-dung-vat-lieu-loc'],
 ['phu-kien','Phụ kiện','Máy bơm:may-bom|Máy sủi:may-sui-may-lam-mat-chiler|Máy sưởi:may-suoi|Thổi luồng:thoi-luong|Đèn UV:den-uv|Chiller, Quạt làm mát:chiller-quat-lam-mat|Dụng cụ:dung-cu|Thức ăn cho cá:thuc-an'],
 ['da-lua-va-cat','Đá / Lũa / Cát','Đá:lua-da-cat-soi|Lũa:lua|Bonsai:bonsai|Cát:cat'],
 ['thuoc-xu-ly-van-de','Hóa chất','Vi sinh:diet-oc|Phân nước:khoang-chat-bo-sung-va-vitamin-thuoc-xu-ly-van-de|Bộ thử nước:bay-san-diet-san|Xử lý bệnh cá:chua-benh-duong|Xử lí rêu:diet-reu|Hóa chất khác:hoa-chat-khac'],
 ['be-kinh-va-chan','Bể kính','Bể đúc:be-duc|Kính siêu trong:be-chu-nhat|Kính Việt Nhật:kinh-viet-nhat|Chân bể cá:be-cubic'],
 ['nen-cho-be-thuy-sinh','Nền','Chihiros:phan-nen-chihiros|Contro Soil:contro-soil|Master Soil:master-soil|Tropica:phan-tropica|Vũ Aqua:vu-aqua|Dennerle:phan-nen-dennerle|Gex:phan-nen-gex'],
 ['co2','CO2','Bình CO2:binh-co2|Van CO2:van-co2|Trộn CO2:tron-co2|Phụ kiện CO2:khac'],
 ['cay-va-ca-thuy-sinh','Sinh vật','Cá thủy sinh:ca-thuy-sinh|Cây thủy sinh:cay-thuy-sinh']
].map(([rootSlug,parentLabel,list])=>({rootSlug,parentLabel,children:list.split('|').map(x=>{const i=x.lastIndexOf(':');return{label:x.slice(0,i),legacySlug:x.slice(i+1)}})}));
assert.equal(source.length,11);assert.equal(source.reduce((n,x)=>n+x.children.length,0),75);
const norm=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,' ').trim();
const dir='artifacts/header-submenus';
fs.mkdirSync(dir,{recursive:true});
const result={menuId,scope:'Only new product_cat children and new Header VI menu items',createdCategories:[],createdMenuItems:[],reusedCategories:0,reusedMenuItems:0};
const save=()=>fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2)+'\n');
let browser;
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WP credentials unavailable');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
 if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
 }
 await page.waitForURL(x=>x.pathname.startsWith('/wp-admin/'),{timeout:45000});
 const nonceRes=await page.request.get(wp+'/wp-admin/admin-ajax.php?action=rest-nonce');
 assert.equal(nonceRes.status(),200);
 const nonce=(await nonceRes.text()).trim();assert(nonce);
 const headers={'X-WP-Nonce':nonce,'Accept':'application/json','Cache-Control':'no-cache'};
 const rest=async(path,data)=>{
   let res;
   for(let attempt=0;attempt<3;attempt++){
     res=await(data===undefined?page.request.get(wp+path,{headers,timeout:25000}):page.request.post(wp+path,{headers,data,timeout:25000}));
     if(![429,502,503,504].includes(res.status()))break;
     await new Promise(r=>setTimeout(r,(attempt+1)*1500));
   }
   const text=await res.text();
   if(!res.ok())throw Error('REST '+path+' HTTP '+res.status()+' '+text.slice(0,240));
   return JSON.parse(text);
 };
 const list=async(path)=>{
   const records=[];
   for(let pageNumber=1;pageNumber<12;pageNumber++){
     const items=await rest(path+(path.includes('?')?'&':'?')+'per_page=100&page='+pageNumber+'&_ts='+Date.now());
     assert(Array.isArray(items));records.push(...items);
     if(items.length<100)return records;
   }
   throw Error('Too many pages '+path);
 };
 const catsPath='/wp-json/wp/v2/product_cat?context=edit';
 const itemsPath='/wp-json/wp/v2/menu-items?context=edit&menus='+menuId;
 const menu=await rest('/wp-json/wp/v2/menus/'+menuId+'?context=edit');
 assert.equal(menu.name,'Header VI','Wrong canonical WordPress menu');
 let cats=await list(catsPath),items=await list(itemsPath);
 const parents=new Map();
 for(const group of source){
   const cat=cats.find(c=>Number(c.parent)===0&&c.slug===group.rootSlug);
   const item=items.find(i=>Number(i.parent)===0&&norm(i.title?.raw||i.title?.rendered)===norm(group.parentLabel)&&i.url==='/san-pham/'+group.rootSlug);
   assert(cat&&item,'Missing validated parent '+group.rootSlug);
   parents.set(group.rootSlug,{categoryId:cat.id,itemId:item.id});
 }
 assert.equal(items.filter(i=>Number(i.parent)===0).length,11);
 fs.writeFileSync(dir+'/before.json',JSON.stringify({parentMenu:items.filter(i=>Number(i.parent)===0),existingChildMenu:items.filter(i=>Number(i.parent)!==0),categoryCount:cats.length},null,2)+'\n');
 console.log('HEADER_SUBMENU_PREFLIGHT='+JSON.stringify({groups:11,desiredChildren:75,menuId,existingCategories:cats.length,existingMenuItems:items.length}));
 for(const group of source){
   const {categoryId,itemId}=parents.get(group.rootSlug);
   for(const child of group.children){
     const matched=cats.filter(c=>Number(c.parent)===categoryId&&norm(c.name)===norm(child.label));
     if(matched.length>1)throw Error('Ambiguous existing category '+child.label);
     let category=matched[0];
     if(!category){
       let slug=child.legacySlug;
       if(cats.some(c=>c.slug===slug))slug=group.rootSlug+'-'+slug;
       if(!/^[a-z0-9-]{1,130}$/.test(slug)||cats.some(c=>c.slug===slug))throw Error('Unsafe/duplicate slug '+slug);
       category=await rest('/wp-json/wp/v2/product_cat',{name:child.label,slug,parent:categoryId});
       if(!Number.isInteger(category.id)||category.slug!==slug||Number(category.parent)!==categoryId)throw Error('Category write mismatch '+slug);
       result.createdCategories.push(category.id);save();
       cats.push(category);
     }else result.reusedCategories++;
     const url='/san-pham/'+category.slug;
     const existing=items.filter(i=>Number(i.parent)===itemId&&(i.url===url||norm(i.title?.raw||i.title?.rendered)===norm(child.label)));
     if(existing.length>1)throw Error('Duplicate existing child '+url);
     if(existing.length){
       if(existing[0].url!==url||norm(existing[0].title?.raw||existing[0].title?.rendered)!==norm(child.label))throw Error('Existing menu child mismatch '+url);
       result.reusedMenuItems++;
       continue;
     }
     const made=await rest('/wp-json/wp/v2/menu-items',{title:child.label,type:'custom',url,menus:menuId,parent:itemId,status:'publish'});
     if(!Number.isInteger(made.id)||Number(made.parent)!==itemId||Number(made.menus)!==menuId||made.url!==url)throw Error('Menu write mismatch '+url);
     result.createdMenuItems.push(made.id);save();items.push(made);
     console.log('SUBMENU_SAVED='+group.rootSlug+'/'+category.slug);
   }
 }
 cats=await list(catsPath);items=await list(itemsPath);
 for(const group of source){
   const {categoryId,itemId}=parents.get(group.rootSlug);
   for(const child of group.children){
     const category=cats.find(c=>Number(c.parent)===categoryId&&norm(c.name)===norm(child.label));
     assert(category,'Category readback missing '+child.label);
     const found=items.filter(i=>Number(i.parent)===itemId&&i.url==='/san-pham/'+category.slug&&norm(i.title?.raw||i.title?.rendered)===norm(child.label));
     assert.equal(found.length,1,'Menu readback mismatch '+child.label);
   }
 }
 const canonical=await rest('/wp-json/esc-api/v1/menus?_ts='+Date.now());
 const roots=canonical?.menus?.Header?.vi?.items||[];
 assert.equal(roots.length,11,'Canonical menu lost parents');
 for(const group of source){
   const item=roots.find(i=>norm(i.label)===norm(group.parentLabel));
   assert(item&&Array.isArray(item.children),'Canonical group missing '+group.parentLabel);
   for(const child of group.children)assert(item.children.some(i=>norm(i.label)===norm(child.label)),'Canonical child missing '+group.parentLabel+' '+child.label);
 }
 result.verified=true;result.finishedAt=new Date().toISOString();result.categoryCount=cats.length;result.menuItemCount=items.length;save();
 console.log('HEADER_SUBMENUS_CMS_PASS='+JSON.stringify({groups:11,children:75,createdCategories:result.createdCategories.length,createdMenuItems:result.createdMenuItems.length,reusedCategories:result.reusedCategories,reusedMenuItems:result.reusedMenuItems}));
})().catch(e=>{result.error=String(e.stack||e.message);save();console.error('HEADER_SUBMENUS_CMS_FAIL='+result.error);process.exitCode=1}).finally(async()=>{await browser?.close().catch(()=>{})});
