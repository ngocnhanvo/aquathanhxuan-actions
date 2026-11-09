'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const SOURCE='https://aquathanhxuan.com';
const TARGET_WP='https://admin.aquathanhxuan.io.vn';
const TARGET_WEB='https://aquathanhxuan.io.vn';
const DIR='artifacts/product-detail-parity';
fs.mkdirSync(DIR,{recursive:true});
const summary={
 startedAt:new Date().toISOString(),
 scope:'20 brand categories, storefront products; source wc/store/v1 vs authenticated target wc/v3; 4 public detail samples',
 source:SOURCE,target:TARGET_WEB,errors:[],items:[],samples:[],categories:[],
 comparisons:{},status:'STARTED'
};
const save=()=>fs.writeFileSync(DIR+'/report.json',JSON.stringify(summary,null,2)+'\n');
save();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const normName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
async function sourceJson(path){
 let last;
 for(let n=0;n<3;n++){
  try{
   const response=await fetch(SOURCE+path,{signal:AbortSignal.timeout(30000)});
   assert.equal(response.status,200,'Source '+path);
   return await response.json();
  }catch(e){last=e;if(n<2)await pause(800*(n+1))}
 }
 throw last;
}
async function sourceAll(path){
 const rows=[];
 for(let page=1;page<=20;page++){
  const response=await sourceJson(path+(path.includes('?')?'&':'?')+'per_page=100&page='+page);
  assert(Array.isArray(response));
  rows.push(...response);
  if(response.length<100)break;
 }
 return rows;
}
async function audit(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const admin=await browser.newPage();
  await admin.goto(TARGET_WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await admin.locator('#user_login').count()){
   assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing authorized CMS QA credentials');
   await admin.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await admin.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await admin.locator('#wp-submit').click();
  }
  await admin.waitForURL(url=>url.pathname.startsWith('/wp-admin/'),{timeout:45000});
  const nr=await admin.request.get(TARGET_WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nr.status(),200,'Read-only WordPress REST nonce');
  const headers={'X-WP-Nonce':(await nr.text()).trim()};
  async function targetJson(path){
   let last;
   for(let attempt=0;attempt<3;attempt++){
    try{
     const response=await admin.request.get(TARGET_WP+path,{headers,timeout:35000});
     assert.equal(response.status(),200,'Target '+path+' HTTP '+response.status());
     return await response.json();
    }catch(e){last=e;if(attempt<2)await pause(700*(attempt+1))}
   }
   throw last;
  }
  async function targetAll(path){
   const out=[];
   for(let page=1;page<=20;page++){
    const arr=await targetJson(path+(path.includes('?')?'&':'?')+'per_page=100&page='+page);
    assert(Array.isArray(arr));
    out.push(...arr);
    if(arr.length<100)break;
   }
   return out;
  }
  const [sourceCats,targetCats]=await Promise.all([
   sourceAll('/wp-json/wc/store/v1/products/categories'),
   targetAll('/wp-json/wc/v3/products/categories')
  ]);
  const scRoot=sourceCats.find(x=>x.slug==='thuong-hieu');
  const tcRoot=targetCats.find(x=>x.slug==='thuong-hieu');
  assert(scRoot&&tcRoot,'Brand taxonomy root missing');
  const brands=targetCats.filter(x=>Number(x.parent)===Number(tcRoot.id));
  assert.equal(brands.length,20,'Expected 20 brands');
  const raw=[];
  for(const brand of brands){
   const sourceBrand=sourceCats.find(x=>Number(x.parent)===Number(scRoot.id)&&normName(x.name)===normName(brand.name));
   if(!sourceBrand){
    assert.equal(brand.name,'FKSC','Unknown source brand '+brand.name);
    summary.categories.push({name:brand.name,sourceCount:0,targetCount:0,exception:'FKSC source category empty'});
    continue;
   }
   const [srcRows,dstRows]=await Promise.all([
    sourceAll('/wp-json/wc/store/v1/products?category='+sourceBrand.id),
    targetAll('/wp-json/wc/v3/products?status=publish&category='+brand.id)
   ]);
   const dest=new Map(dstRows.map(x=>[x.slug,x]));
   summary.categories.push({name:brand.name,sourceCount:srcRows.length,targetCount:dstRows.length});
   for(const src of srcRows){
    const dst=dest.get(src.slug);
    if(!dst){summary.errors.push({slug:src.slug,error:'MISSING_TARGET_PRODUCT'});continue}
    if(!raw.some(x=>x.slug===src.slug))raw.push({slug:src.slug,src,dst});
   }
   console.log('DETAIL_BRAND_INVENTORY='+JSON.stringify(summary.categories.at(-1)));
  }
  const normalizer=await browser.newPage();
  const normalized=await normalizer.evaluate(items=>{
   const clean=html=>{
    const el=document.createElement('div');
    el.innerHTML=String(html||'');
    el.querySelectorAll('script,style').forEach(x=>x.remove());
    return (el.textContent||'').replace(/\u00a0/g,' ').normalize('NFC').replace(/\s+/g,' ').trim();
   };
   return items.map(item=>({
    slug:item.slug,
    srcName:clean(item.src.name),
    dstName:clean(item.dst.name),
    srcFull:clean(item.src.description),
    dstFull:clean(item.dst.description),
    srcShort:clean(item.src.short_description),
    dstShort:clean(item.dst.short_description),
   }));
  },raw);
  await normalizer.close();
  const checks=['name','price','regularPrice','stock','full','short','attributes','sku'];
  const counts=Object.fromEntries(checks.map(x=>[x,{pass:0,mismatch:0,sourceNonEmpty:0,targetEmpty:0}]));
  for(let index=0;index<raw.length;index++){
   const {src,dst,slug}=raw[index];
   const c=normalized[index];
   const sourceAttrs=(src.attributes||[]).map(x=>String(x.name||x.taxonomy||x.id||'')+':'+(x.terms||x.options||[]).map(t=>typeof t==='string'?t:t.name).sort().join(',')).sort().join('|');
   const targetAttrs=(dst.attributes||[]).map(x=>String(x.name||x.slug||x.id||'')+':'+(x.options||[]).slice().sort().join(',')).sort().join('|');
   const fields={
    name:[c.srcName,c.dstName],
    price:[String(src.prices?.price||''),String(dst.price||'')],
    regularPrice:[String(src.prices?.regular_price||''),String(dst.regular_price||'')],
    stock:[String(src.is_in_stock),String(dst.stock_status==='instock')],
    full:[c.srcFull,c.dstFull],
    short:[c.srcShort,c.dstShort],
    attributes:[sourceAttrs,targetAttrs],
    sku:[String(src.sku||''),String(dst.sku||'')]
   };
   const flags=[];
   for(const [name,[left,right]] of Object.entries(fields)){
    if(left)counts[name].sourceNonEmpty++;
    if(left&&!right)counts[name].targetEmpty++;
    const match=left===right;
    counts[name][match?'pass':'mismatch']++;
    if(!match){
     let at=0;
     while(at<Math.min(left.length,right.length)&&left[at]===right[at])at++;
     flags.push({field:name,sourceLength:left.length,targetLength:right.length,
       firstDifferenceIndex:at,
       sourceAround:left.slice(Math.max(0,at-70),at+150),
       targetAround:right.slice(Math.max(0,at-70),at+150)});
    }
   }
   const srcHasDiscount=Number(src.prices?.price)<Number(src.prices?.regular_price);
   const dstHasDiscount=Number(dst.sale_price||0)>0;
   if(srcHasDiscount!==dstHasDiscount)flags.push({field:'discountFlag',srcHasDiscount,dstHasDiscount});
   summary.items.push({slug,sourceId:src.id,targetId:dst.id,flags,shortContentExists:!!c.srcShort,fullContentExists:!!c.srcFull});
  }
  summary.comparisons=counts;
  summary.distinctProducts=raw.length;
  console.log('DETAIL_CONTENT_COUNTS='+JSON.stringify(counts));
  const examples=[
    'hanging-kits-bo-kit-treo-den-wrgb2-pro-chihiros',
    'phan-nen-dennerle-scapers-soil-4lit',
    'may-sui-khi-atman-hp-12000',
    'seachem-matrix-0-5'
  ];
  for(const slug of examples){
   const record=raw.find(x=>x.slug===slug);
   if(!record)continue;
   const item={slug,sourceUrl:SOURCE+'/san-pham/'+slug+'/',targetUrl:TARGET_WEB+'/san-pham/'+slug};
   for(const side of ['source','target']){
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const url=side==='source'?item.sourceUrl:item.targetUrl;
    try{
     const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
     item[side+'Http']=response?.status();
     if(response?.status()!==200){item[side+'Error']='HTTP '+response?.status();continue}
     const fields=await page.evaluate(()=>{
      const all=document.body.innerText||'';
      return {
       title:document.title,
       seoDescription:document.querySelector('meta[name="description"]')?.content||'',
       h1:document.querySelector('h1')?.textContent?.replace(/\s+/g,' ').trim()||'',
       hasStockLabel:/Tình trạng\s*:/.test(all),
       hasDiscountCoupon:/Mã MF5/.test(all),
       hasBuyNow:/Mua ngay/i.test(all),
       hasConsultation:/Gọi tư vấn/i.test(all),
       hasDetailedInfo:/Thông tin chi tiết/i.test(all),
       containsShortDescription:false,
       bodyLength:all.length,
       oldPriceDisplayed:/375[.,]000/.test(all),
       descriptionLength:document.querySelector('.product-description')?.textContent?.trim().length||0,
       detailWrapper:!!document.querySelector('#data-content-wrapper')
      };
     });
     const short=c=>c.replace(/\s+/g,' ').trim();
     const original=normalized.find(x=>x.slug===slug);
     const originalShort=short(original?.srcShort||'');
     fields.containsShortDescription=originalShort.length>20? (await page.evaluate(fragment=>(document.body.innerText||'').replace(/\s+/g,' ').includes(fragment),originalShort.slice(0,65))):null;
     item[side]=fields;
     if(side==='source'||side==='target'){
      const filename=side+'-'+slug+'.png';
      await page.screenshot({path:DIR+'/'+filename,fullPage:true,timeout:45000});
      item[side+'Screenshot']=filename;
     }
    }catch(err){item[side+'Error']=String(err).slice(0,220)}
    finally{await page.close()}
   }
   summary.samples.push(item);
   console.log('DETAIL_PAGE_SAMPLE='+JSON.stringify(item).slice(0,2400));
   save();
  }
  const missing=summary.items.filter(x=>x.flags.length);
  summary.status=summary.errors.length||missing.length||summary.samples.some(x=>x.sourceHttp!==200||x.targetHttp!==200)
    ?'GAPS_FOUND':'DATA_FIELDS_MATCH';
  summary.mismatchedProducts=missing.length;
  console.log('DETAIL_AUDIT_RESULT='+JSON.stringify({
   status:summary.status,distinctProducts:summary.distinctProducts,
   mismatchedProducts:summary.mismatchedProducts,comparisons:summary.comparisons,
   sampleCount:summary.samples.length,errors:summary.errors.length
  }));
 }finally{await browser.close();save()}
}
audit().catch(err=>{
 summary.status='AUDIT_FAILED';
 summary.errors.push(String(err.stack||err).slice(0,2000));
 save();
 console.error('DETAIL_AUDIT_FAILED='+String(err.stack||err).slice(0,2000));
 process.exitCode=1;
});