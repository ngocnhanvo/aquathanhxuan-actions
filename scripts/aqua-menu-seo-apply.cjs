'use strict';
/** WordPress-owned, source-audited SEO for ONLY legacy menu taxonomy.
 * Reads verified GET artifact, writes term SEO through native Yoast editor,
 * and adds exact 301 redirect records through the existing WordPress route CPT.
 * Never changes page titles, slugs, product prices, menus or source .com host.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const {buildSeoManifest}=require('./aqua-menu-seo-mapping.cjs');
const WP='https://admin.aquathanhxuan.io.vn';
const pilot=process.env.SEO_PILOT_ONLY==='true';
const output='artifacts/aqua-menu-seo-apply';
fs.mkdirSync(output,{recursive:true});
const source=JSON.parse(fs.readFileSync('seo-report/report.json','utf8'));
const manifest=buildSeoManifest(source);
fs.writeFileSync(output+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const report={status:'STARTED',pilot,manifest_count:manifest.length,writes:{seo:[],redirect:[]},skipped:{seo:[],redirect:[]},errors:[],started_at:new Date().toISOString(),scope:'MENU_CATEGORY_SEO_AND_EXACT_LEGACY_REDIRECTS'};
const save=()=>fs.writeFileSync(output+'/result.json',JSON.stringify(report,null,2)+'\n');
const selected=pilot?manifest.slice(0,1):manifest;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WP admin credentials');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:65000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nonceRes=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:25000});
  assert(nonceRes.ok(),'Cannot access native WordPress REST nonce');
  const nonce=(await nonceRes.text()).trim();
  assert(/^[a-zA-Z0-9_-]{8,}$/.test(nonce),'Invalid WP nonce');
  const headers={'X-WP-Nonce':nonce,'Content-Type':'application/json'};
  async function rest(method,path,payload){
   const response=await page.request.fetch(WP+path,{
    method,headers,data:payload===undefined?undefined:JSON.stringify(payload),timeout:50000
   });
   const raw=await response.text();let data;
   try{data=JSON.parse(raw)}catch{throw Error('Invalid JSON '+method+' '+path+' HTTP '+response.status())}
   if(!response.ok())throw Error(method+' '+path+' HTTP '+response.status()+' '+String(data.code||data.message||'').slice(0,200));
   return data;
  }
  let currentTerms=await rest('GET','/wp-json/astro/v1/get-product-categories');
  assert(Array.isArray(currentTerms)&&currentTerms.length>=90,'Live WordPress taxonomy changed during audit');
  const liveTerms=new Map(currentTerms.map(term=>[Number(term.id),term]));
  for(const item of selected){
   const target=liveTerms.get(item.term_id);
   assert(target&&target.slug===item.term_slug,'Taxonomy mismatch for '+item.new_path);
   const beforeTitle=String(target.seoTitle||'').trim();
   const beforeDesc=String(target.seoDescription||'').trim();
   // The first audit timed out on 9 old pages. They were independently
   // verified later; replace only our known provisional root title.
   const provisionalTitle=item.old_path==='/danh-muc/cay-va-ca-thuy-sinh'
    ? 'SINH VẬT – AQua Thanh Xuân' : '';
   const wantedTitle=(!beforeTitle||beforeTitle===provisionalTitle)?item.title:beforeTitle;
   const wantedDesc=beforeDesc||item.description;
   if(beforeTitle===wantedTitle&&beforeDesc===wantedDesc){
    report.skipped.seo.push({id:item.term_id,slug:item.term_slug,reason:'Already configured'});
    continue;
   }
   const url=WP+'/wp-admin/term.php?taxonomy=product_cat&tag_ID='+item.term_id+'&post_type=product';
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:50000});
   assert(response&&response.ok(),'Term editor missing '+item.term_id);
   const fields=await page.locator('#hidden_wpseo_title,#hidden_wpseo_desc').count();
   assert(fields===2,'Missing native Yoast fields on term '+item.term_id);
   const original=await page.locator('#hidden_wpseo_title').inputValue();
   const originalDesc=await page.locator('#hidden_wpseo_desc').inputValue();
   // Never overwrite a saved/meaningful Yoast term value. Re-check editor source.
   if(original.trim() && original.trim()!==wantedTitle && original.trim()!==provisionalTitle) throw Error('Yoast title changed concurrently '+item.term_id);
   if(originalDesc.trim() && originalDesc.trim()!==wantedDesc) throw Error('Yoast description changed concurrently '+item.term_id);
   // WordPress category editor posts native form fields. Don't navigate other tabs.
   await page.evaluate(({title,description})=>{
    const t=document.querySelector('#hidden_wpseo_title');
    const d=document.querySelector('#hidden_wpseo_desc');
    const form=document.querySelector('form#edittag');
    if(!(t instanceof HTMLInputElement)||!(d instanceof HTMLInputElement)||!(form instanceof HTMLFormElement))throw Error('Native category editor form unavailable');
    t.value=title;d.value=description;
    form.submit();
   },{title:wantedTitle,description:wantedDesc});
   await page.waitForLoadState('domcontentloaded',{timeout:45000});
   let confirmed;
   for(let attempt=0;attempt<3;attempt++){
    const terms=await rest('GET','/wp-json/astro/v1/get-product-categories');
    confirmed=terms.find(t=>Number(t.id)===item.term_id);
    if(confirmed?.seoTitle===wantedTitle && confirmed?.seoDescription===wantedDesc)break;
    await wait(1000);
   }
   assert(confirmed?.seoTitle===wantedTitle && confirmed?.seoDescription===wantedDesc,'Yoast WordPress term save/readback failed ID='+item.term_id+' actual='+JSON.stringify({title:confirmed?.seoTitle,desc:confirmed?.seoDescription}).slice(0,180));
   liveTerms.set(item.term_id,confirmed);
   report.writes.seo.push({id:item.term_id,slug:item.term_slug,source_verified:item.source_title_verified,before:{title:beforeTitle,description:beforeDesc},after:{title:wantedTitle,description:wantedDesc}});
   save();
  }
  const existing=await rest('GET','/wp-json/wp/v2/chuyen-huong-link?status=publish&per_page=100');
  assert(Array.isArray(existing),'Published URL routing registry unavailable');
  const byPath=new Map();
  for(const item of existing){
   const from=String(item?.acf?.from_link||'').replace(/\/+$/,'');
   if(!from)continue;
   if(byPath.has(from))throw Error('Duplicate WordPress redirect already exists from '+from);
   byPath.set(from,item);
  }
  for(const item of selected){
   const earlier=byPath.get(item.old_path);
   if(earlier){
    assert(earlier.acf?.to_link===item.new_path && String(earlier.acf?.type)==='301' && earlier.acf?.enable===true,
     'Conflicting existing WordPress routing rule: '+item.old_path);
    report.skipped.redirect.push({from:item.old_path,id:earlier.id,reason:'Existing matching 301'});
    continue;
   }
   const created=await rest('POST','/wp-json/wp/v2/chuyen-huong-link',{
    status:'publish',
    title:'301 Danh mục cũ: '+item.old_path,
    acf:{from_link:item.old_path,to_link:item.new_path,type:'301',match_type:'Exact',enable:true},
   });
   assert(Number(created.id)>0,'No ID for redirect '+item.old_path);
   const reloaded=await rest('GET','/wp-json/wp/v2/chuyen-huong-link/'+created.id);
   const rule=reloaded?.acf||{};
   assert(reloaded.status==='publish'&&rule.from_link===item.old_path&&rule.to_link===item.new_path&&
    String(rule.type)==='301'&&rule.match_type==='Exact'&&rule.enable===true,
    'WordPress ACF redirect readback failed for '+item.old_path+' id='+created.id+' value='+JSON.stringify(rule).slice(0,210));
   byPath.set(item.old_path,reloaded);
   report.writes.redirect.push({id:created.id,from:item.old_path,to:item.new_path,type:301});
   save();
  }
  report.status='PASS';report.finished_at=new Date().toISOString();save();
  console.log('AQUA_MENU_SEO_APPLY_PASS='+JSON.stringify({pilot,seo_writes:report.writes.seo.length,redirect_writes:report.writes.redirect.length,seo_skips:report.skipped.seo.length,redirect_skips:report.skipped.redirect.length,manifest:manifest.length,source_unverified:selected.filter(x=>!x.source_title_verified).length}));
 }finally{await browser.close()}
})().catch(e=>{
 report.status='FAIL';report.errors.push(String(e.stack||e).slice(0,1000));save();
 console.error('AQUA_MENU_SEO_APPLY_FAIL='+String(e.message||e));
 process.exitCode=1;
});
