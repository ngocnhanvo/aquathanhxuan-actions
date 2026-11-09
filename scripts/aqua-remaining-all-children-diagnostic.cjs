'use strict';
/** Read-only source/target/public taxonomy audit for every verified nine-menu child. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const SOURCE='https://aquathanhxuan.com', WP='https://admin.aquathanhxuan.io.vn', PUBLIC='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-remaining-child-diagnostic/all-children.json';
fs.mkdirSync('artifacts/aqua-remaining-child-diagnostic',{recursive:true});
const report={source:SOURCE,wp:WP,public:PUBLIC,scope:'all-46-original-child-categories',issues:[],children:[],status:'STARTED'};
const save=()=>fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
const norm=s=>String(s||'').normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g,' ').trim();
const roots=[
 [1809,1769],[1003,1770],[2012,1771],[1994,1772],[2057,1773],[909,1774],[972,1775],[1105,1776],[618,1777]
];
async function original(url){
 const r=await fetch(SOURCE+url,{signal:AbortSignal.timeout(45000)});
 assert.equal(r.status,200,'Source HTTP '+r.status+' '+url);
 return r.json();
}
async function pages(get,url,max=50){
 const all=[];
 for(let n=1;n<=max;n++){
  const path=url+(url.includes('?')?'&':'?')+'per_page=100&page='+n;
  const rows=await get(path);
  assert(Array.isArray(rows),'Expected REST array '+url);
  all.push(...rows);
  if(rows.length<100)return all;
 }
 throw Error('Pagination exceeded '+url);
}
async function main(){
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing CMS secrets');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:60000});
  const nonce=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nonce.status(),200);
  const headers={'X-WP-Nonce':(await nonce.text()).trim()};
  const target=async url=>{
   const r=await page.request.get(WP+url,{headers,timeout:50000});
   assert.equal(r.status(),200,'Target HTTP '+r.status()+' '+url);
   return r.json();
  };
  const [sourceCats,targetCats,targetProducts,sourceLists]=await Promise.all([
   pages(original,'/wp-json/wc/store/v1/products/categories',30),
   pages(target,'/wp-json/wc/v3/products/categories',30),
   pages(target,'/wp-json/wc/v3/products?status=publish&orderby=id&order=asc',150),
   Promise.all(roots.map(([id])=>pages(original,'/wp-json/wc/store/v1/products?category='+id,30)))
  ]);
  const bySource=new Map();
  for(const list of sourceLists)for(const p of list)bySource.set(Number(p.id),p);
  assert.equal(bySource.size,389,'Expected 389 original products');
  const byTargetSlug=new Map(targetProducts.map(p=>[p.slug,p]));
  const byTargetId=new Map(targetProducts.map(p=>[Number(p.id),p]));
  const sourceChildCats=sourceCats.filter(c=>roots.some(r=>r[0]===Number(c.parent)));
  assert.equal(sourceChildCats.length,46,'Expected 46 original child terms');
  for(const cat of sourceChildCats){
   const parent=roots.find(r=>r[0]===Number(cat.parent));
   const matches=targetCats.filter(t=>Number(t.parent)===parent[1]&&(t.slug===cat.slug||norm(t.name)===norm(cat.name)));
   if(matches.length!==1){report.issues.push({slug:cat.slug,problem:'target child mapping ambiguous',matches:matches.map(x=>x.id)});save();continue;}
   const dest=matches[0];
   const sourceExpected=new Set([...bySource.values()].filter(p=>(p.categories||[]).some(c=>Number(c.id)===Number(cat.id)))
      .map(p=>Number(byTargetSlug.get(p.slug)?.id)));
   const response=await page.goto(PUBLIC+'/san-pham/'+dest.slug,{waitUntil:'domcontentloaded',timeout:60000});
   if(response?.status()!==200){report.issues.push({slug:dest.slug,problem:'public http',status:response?.status()});save();continue;}
   const cards=await page.locator('article[data-catalog-product]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-catalog-product'))));
   const unexpected=[];
   for(const id of cards){
    if(sourceExpected.has(id))continue;
    const p=byTargetId.get(id);
    const srcId=Number((p?.meta_data||[]).find(x=>x.key==='_esc_origin_product_id')?.value||0);
    const originalSrc=bySource.get(srcId);
    const data={id,sourceId:srcId,slug:p?.slug,name:p?.name,
      sourceRoots:originalSrc?(originalSrc.categories||[]).filter(c=>roots.some(r=>r[0]===Number(c.id))).map(c=>c.id):[],
      originalCategories:(originalSrc?.categories||[]).map(c=>({id:c.id,slug:c.slug})),
      targetCategories:(p?.categories||[]).map(c=>({id:c.id,slug:c.slug})),
      sourceRootValid:!!originalSrc&&(originalSrc.categories||[]).some(c=>Number(c.id)===parent[0]),
      targetChildAssigned:!!p&&(p.categories||[]).some(c=>Number(c.id)===Number(dest.id)),
      sourceIdentityValid:!!originalSrc&&p?.slug===originalSrc.slug,
    };
    unexpected.push(data);
    if(!data.sourceRootValid||!data.targetChildAssigned||!data.sourceIdentityValid)
      report.issues.push({slug:dest.slug,problem:'invalid additional product',product:data});
   }
   const result={slug:dest.slug,targetId:dest.id,sourceCategoryId:cat.id,rootSourceId:parent[0],
     originalDirect:sourceExpected.size,rendered:cards.length,unexpected};
   report.children.push(result);
   if(unexpected.length)console.log('AQUA_CHILD_AUDIT_EXTRA='+JSON.stringify(result));
   save();
  }
  report.status=report.issues.length?'ISSUES':'PASS';
  save();
  console.log('AQUA_ALL_CHILD_AUDIT_SUMMARY='+JSON.stringify({children:report.children.length,
   unexpectedChildren:report.children.filter(c=>c.unexpected.length).length,
   unexpectedProducts:report.children.reduce((n,c)=>n+c.unexpected.length,0),
   issues:report.issues.length,status:report.status}));
  if(report.issues.length)process.exitCode=1;
 }finally{await browser.close()}
}
main().catch(e=>{report.status='FAIL';report.error=String(e.stack||e).slice(0,2500);save();
 console.error('AQUA_ALL_CHILD_AUDIT_FAIL='+report.error);process.exitCode=1;});
