'use strict';
/**
 * Independent read-only inventory from WooCommerce source and target, scoped
 * to the Brand taxonomy. Produces source oracle separate from importer code.
 */
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const source='https://aquathanhxuan.com';
const target='https://admin.aquathanhxuan.io.vn';
const date=new Date().toISOString();
const output='artifacts/brand-catalog';
fs.mkdirSync(output,{recursive:true});
const auth={};
async function retry(label, fn){
 let failure;
 for(let attempt=0;attempt<4;attempt++){
  try{return await fn()}catch(e){
   failure=e;
   const temporary=/ECONNRESET|ETIMEDOUT|socket hang up|timeout|HTTP (429|50[0-9]|52[0-9])/i.test(String(e));
   if(!temporary||attempt===3)break;
   console.log('BRAND_NETWORK_RETRY='+JSON.stringify({label,attempt:attempt+1,error:String(e).slice(0,120)}));
   await new Promise(resolve=>setTimeout(resolve,750*(attempt+1)));
  }
 }
 throw failure;
}
async function get(url,opts={}){
 return retry(url,async()=>{
  const res=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json',...opts.headers}});
  let data;
  try{data=await res.json()}catch(e){throw Error('JSON '+res.status+' '+url+' '+e)}
  if(!res.ok)throw Error('HTTP '+res.status+' '+url+' '+JSON.stringify(data).slice(0,150));
  return {data,total:Number(res.headers.get('x-wp-total')||0),pages:Number(res.headers.get('x-wp-totalpages')||1)};
 });
}
async function allPages(base,perPage=100,maxPages=30){
 let out=[];
 for(let p=1;p<=maxPages;p++){
  const req=await get(base+(base.includes('?')?'&':'?')+'per_page='+perPage+'&page='+p);
  assert(Array.isArray(req.data),'Invalid array '+base);
  out.push(...req.data);
  if(p>=req.pages||req.data.length<perPage)break;
 }
 return out;
}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]/g,'');
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD,'Missing CMS credentials');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(target+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:40000});
  const n=await page.request.get(target+'/wp-admin/admin-ajax.php?action=rest-nonce');assert.equal(n.status(),200);
  const nonce=(await n.text()).trim();
  auth.headers={'X-WP-Nonce':nonce};
  const srcCats=await allPages(source+'/wp-json/wc/store/v1/products/categories');
  // Target WC REST v3 must read unpublished category data with WordPress nonce
  const targetCats=[];
  for(let p=1;p<=30;p++){
   const r=await retry('target categories '+p,()=>page.request.get(target+'/wp-json/wc/v3/products/categories?per_page=100&page='+p,{headers:auth.headers,timeout:40000}));
   if(r.status()===400)break;
   assert.equal(r.status(),200,'Target WC category API '+p);
   let arr=await r.json(); assert(Array.isArray(arr),'Invalid target category list');
   targetCats.push(...arr);
   if(arr.length<100)break;
  }
  const sourceParents=srcCats.filter(x=>norm(x.slug)==='thuonghieu'||norm(x.name)==='thuonghieu');
  const targetParents=targetCats.filter(x=>norm(x.slug)==='thuonghieu'||norm(x.name)==='thuonghieu');
  assert.equal(sourceParents.length,1,'Source Thương hiệu parent category unclear');
  assert.equal(targetParents.length,1,'Target Thương hiệu parent category unclear');
  const srcParent=sourceParents[0],tgtParent=targetParents[0];
  const sourceBrands=srcCats.filter(x=>Number(x.parent)===Number(srcParent.id));
  const targetBrands=targetCats.filter(x=>Number(x.parent)===Number(tgtParent.id));
  console.log('BRAND_CATEGORY_TOPOLOGY='+JSON.stringify({sourceCount:srcCats.length,targetCount:targetCats.length,sourceParent:{id:srcParent.id,slug:srcParent.slug,name:srcParent.name},targetParent:{id:tgtParent.id,slug:tgtParent.slug,name:tgtParent.name},sourceBrands:sourceBrands.map(x=>({id:x.id,name:x.name,slug:x.slug,count:x.count})),targetBrands:targetBrands.map(x=>({id:x.id,name:x.name,slug:x.slug,count:x.count}))}));
  const sourceByNorm=new Map(srcCats.map(cat=>[norm(cat.name),cat]));
  const inspected=targetBrands.map(targetCategory=>{
    let sourceCategory=sourceBrands.find(c=>norm(c.name)===norm(targetCategory.name));
    if(!sourceCategory&&targetCategory.slug==='may-loc-fksc'){
       // FKSC is a source equipment taxonomy rather than a direct source brand.
       const candidates=srcCats.filter(c=>norm(c.name)==='fksc'||c.slug==='may-loc-fksc');
       if(candidates.length===1)sourceCategory=candidates[0];
    }
    return {targetCategory,sourceCategory};
  });
  console.log('BRAND_CATALOG_MATCHES='+JSON.stringify(inspected.map(x=>({
    target:{id:x.targetCategory.id,slug:x.targetCategory.slug,name:x.targetCategory.name},
    source:x.sourceCategory?{id:x.sourceCategory.id,slug:x.sourceCategory.slug,name:x.sourceCategory.name}:null
  }))));
  const results=[];
  for(const {sourceCategory:cat,targetCategory:match} of inspected){
   if(!cat){
      results.push({source:null,target:{id:match.id,name:match.name,slug:match.slug,count:0},
        status:'SOURCE_CATEGORY_NOT_FOUND',srcProducts:[],tgtProducts:[],missing:[]});
      console.log('BRAND_SOURCE_CATEGORY_NOT_FOUND='+match.name);
      continue;
   }
   const srcList=await allPages(source+'/wp-json/wc/store/v1/products?category='+cat.id,100,40);
   const srcIds=srcList.map(x=>Number(x.id));
   assert(new Set(srcIds).size===srcIds.length,'Duplicate source product ID in '+cat.name);
   const targetList=[];
   if(match){
    for(let p=1;p<=20;p++){
      const resp=await retry('target products '+match.id+' page '+p,()=>page.request.get(target+'/wp-json/wc/v3/products?per_page=100&page='+p+'&category='+match.id+'&status=any',{headers:auth.headers,timeout:40000}));
      if(resp.status()===400)break;
      assert.equal(resp.status(),200,'Target WC brand products status '+cat.name+' page '+p);
      const arr=await resp.json();assert(Array.isArray(arr));
      targetList.push(...arr);
      if(arr.length<100)break;
    }
   }
   const originRefs=new Set(targetList.map(x=>(x.meta_data||[]).find(z=>z.key==='_esc_origin_product_id')?.value).filter(Boolean).map(String));
   const tgtSlugs=new Set(targetList.map(x=>x.slug));
   const missing=srcList.filter(x=>!originRefs.has(String(x.id))&&!tgtSlugs.has(x.slug));
   const targetBySlug=new Map(targetList.map(x=>[x.slug,x]));
   const priceMismatches=srcList.filter(x=>{
     const dst=targetBySlug.get(x.slug);
     return dst && String(dst.price)!==String(x.prices?.price||'');
   }).map(x=>({sourceId:x.id,slug:x.slug,sourcePrice:String(x.prices?.price||''),targetPrice:String(targetBySlug.get(x.slug)?.price||'')}));
   const kinds=srcList.reduce((m,x)=>(m[x.type]=(m[x.type]||0)+1,m),{});
   const record={
      source:{id:cat.id,name:cat.name,slug:cat.slug,count:srcList.length},
      target:match?{id:match.id,name:match.name,slug:match.slug,count:targetList.length}:null,
      status:match?'matched':'CATEGORY_UNMATCHED',
      types:kinds,
      srcProducts:srcList.map(x=>({id:x.id,name:x.name,slug:x.slug,type:x.type,price:x.prices?.price,
         regular_price:x.prices?.regular_price,currency_minor_unit:x.prices?.currency_minor_unit,
         media:(x.images||[]).map(i=>({src:i.src,alt:i.alt})),in_stock:x.is_in_stock,
         categories:(x.categories||[]).map(y=>({id:y.id,name:y.name,slug:y.slug}))})),
      tgtProducts:targetList.map(x=>({id:x.id,name:x.name,slug:x.slug,status:x.status,
         sourceId:(x.meta_data||[]).find(z=>z.key==='_esc_origin_product_id')?.value||null,
         categories:(x.categories||[]).map(c=>c.id)})),
      missing:missing.map(x=>({id:x.id,slug:x.slug,name:x.name,type:x.type})),
      priceMismatches
   };
   results.push(record);
   console.log('BRAND_INVENTORY='+JSON.stringify({brand:cat.name,src:srcList.length,dst:targetList.length,missing:missing.length,
      srcId:cat.id,dstId:match?.id,srcSlug:cat.slug,dstSlug:match?.slug,types:kinds,
      priceMismatchCount:priceMismatches.length,priceMismatchSample:priceMismatches.slice(0,3),
      sampleMissing:record.missing.slice(0,5)}));
  }
  const manifest={source,target,date,srcParent:{id:srcParent.id,slug:srcParent.slug},tgtParent:{id:tgtParent.id,slug:tgtParent.slug},results};
  fs.writeFileSync(output+'/source-target-parity.json',JSON.stringify(manifest,null,2)+'\n');
  console.log('BRAND_INVENTORY_SUMMARY='+JSON.stringify({brands:results.length,mapped:results.filter(x=>x.target).length,
    sourceProducts:results.reduce((n,x)=>n+x.srcProducts.length,0),targetProducts:results.reduce((n,x)=>n+x.tgtProducts.length,0),
    missing:results.reduce((n,x)=>n+x.missing.length,0),unmatched:results.filter(x=>!x.target).map(x=>x.source.name)}));
 }finally{await browser.close()}
})().catch(e=>{console.error('BRAND_INVENTORY_FAIL='+e.stack);process.exitCode=1});
