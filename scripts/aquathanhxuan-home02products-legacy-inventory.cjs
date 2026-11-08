// Read-only verification of real legacy WooCommerce products. No CMS mutation.
const fs=require('node:fs');
const {chromium}=require('playwright');
const targetNames=[
'Đèn Led UFO BAO YOU WRGB','Đèn A60-80W ZAQUA','ĐÈN KAOKUI 70W PRO',
'Đèn COCO FA Series 100w','Đèn thủy sinh Neo Helios Flat Nano S3 Pro 13W',
'Đèn Rọi Coco Spotlight SD300 5W','Đèn Rọi Coco Spotlight SD300 7W',
'Phân nền cao cấp Prodibio Aqua Growth Soil 9L',
'Cốt nền cao cấp Prodibio Aqua Terra 6L','Cốt nền cao cấp Prodibio Aqua Terra 3L'
];
const norm=x=>String(x||'').normalize('NFC').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().toLocaleLowerCase('vi');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const found=[],missing=[],apiErrors=[];
 try{
  for(const name of targetNames){
   let matched=null;
   for(const search of [name.split(/\s+/).slice(-3).join(' '),name.split(/\s+/).slice(0,3).join(' ')]){
    const u='https://aquathanhxuan.com/wp-json/wc/store/v1/products?per_page=100&search='+encodeURIComponent(search);
    const r=await page.request.get(u,{timeout:30000});
    if(r.status()!==200){apiErrors.push({name,status:r.status()});continue;}
    const data=await r.json();
    if(!Array.isArray(data)){apiErrors.push({name,error:'non-array'});continue;}
    const equals=data.filter(p=>norm(p.name)===norm(name));
    if(equals.length>1)throw Error('Ambiguous source product name: '+name);
    if(equals.length===1){matched=equals[0];break;}
   }
   if(!matched){missing.push(name);continue;}
   found.push({id:matched.id,name:matched.name,slug:matched.slug,permalink:matched.permalink,
     price:matched.prices?.price,regular_price:matched.prices?.regular_price,
     sale_price:matched.prices?.sale_price,currency_minor_unit:matched.prices?.currency_minor_unit,
     image:matched.images?.[0]?.src||null,image_alt:matched.images?.[0]?.alt||null,
     type:matched.type, is_purchasable:matched.is_purchasable, is_in_stock:matched.is_in_stock});
  }
  console.log('LEGACY_PRODUCT_AUDIT='+JSON.stringify({found,missing,apiErrors}));
  fs.mkdirSync('chatgpt',{recursive:true});
  fs.writeFileSync('chatgpt/home02products-legacy.json',JSON.stringify({found,missing,apiErrors},null,2)+'\n');
  if(apiErrors.length)process.exitCode=1;
 }finally{await browser.close()}
})().catch(e=>{console.error('LEGACY_PRODUCT_AUDIT_FAIL='+String(e));process.exitCode=1});
