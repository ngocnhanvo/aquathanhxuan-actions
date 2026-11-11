'use strict';
/** Independent HTTP oracle: 88 exact legacy links, source SEO parity, canonical.
 * Never creates orders, carts, source records or site content.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {buildSeoManifest}=require('./aqua-menu-seo-mapping.cjs');
const source=JSON.parse(fs.readFileSync('seo-report/report.json','utf8'));
const items=buildSeoManifest(source);
const ORIGIN='https://aquathanhxuan.io.vn';
const OLD='https://aquathanhxuan.com';
const OUT='artifacts/aqua-menu-seo-production';
fs.mkdirSync(OUT,{recursive:true});
const report={status:'STARTED',checked:0,entries:[],old_domain_checks:[],origin:ORIGIN,source:OLD,start:new Date().toISOString()};
const save=()=>fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');
const txt=s=>String(s||'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();
function meta(html){
 const title=txt(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const tag=html.match(/<meta\s+[^>]*name=["']description["'][^>]*>/i)?.[0]||html.match(/<meta\s+[^>]*content=["'][^"']*["'][^>]*name=["']description["'][^>]*>/i)?.[0]||'';
 const description=txt(tag.match(/content=["']([^"']*)["']/i)?.[1]||'');
 const canonical=txt(html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i)?.[0]?.match(/href=["']([^"']*)["']/i)?.[1]||'');
 return {title,description,canonical};
}
async function fetchWithTimeout(url,method='GET',redirect='manual'){
 try{
  const r=await fetch(url,{method,redirect,signal:AbortSignal.timeout(28000),headers:{Accept:'text/html','Cache-Control':'no-cache'}});
  return {status:r.status,url:r.url,location:r.headers.get('location')||'',html:method==='HEAD'?'':(await r.text()).slice(0,250000)};
 }catch(e){return {status:0,error:String(e.message||e).slice(0,150),html:''}}
}
async function pool(rows,fn,n=7){let at=0;await Promise.all(Array.from({length:Math.min(rows.length,n)},async()=>{while(at<rows.length){const i=at++;await fn(rows[i],i)}}))}
(async()=>{
 const tested=new Array(items.length);
 await pool(items,async(item,i)=>{
  const from=await fetchWithTimeout(ORIGIN+item.old_path,'GET','manual');
  const fullTarget=new URL(item.new_path,ORIGIN).toString();
  const actualTarget=new URL(from.location||'/',ORIGIN).toString();
  const dest=await fetchWithTimeout(fullTarget,'GET','follow');
  const seo=meta(dest.html);
  const checks={
   redirect301:from.status===301||from.status===308,
   redirectDestination:actualTarget===fullTarget,
   destinationHTTP:dest.status===200,
   title:seo.title===item.title,
   description:seo.description===item.description,
   canonical:seo.canonical===fullTarget,
  };
  tested[i]={index:i+1,...item,redirect_status:from.status,redirect_location:from.location,destination_status:dest.status,seo,checks,pass:Object.values(checks).every(Boolean)};
  if(i%12===0)console.log('AQUA_MENU_SEO_PRODUCTION_PROGRESS='+JSON.stringify({index:i+1,total:items.length,url:item.old_path,from:from.status,to:dest.status,checks}));
 },6);
 report.entries=tested;
 for(const item of items.filter((item,i)=>i===0||i===21||i===44||i===70)){
  const old=await fetchWithTimeout(OLD+item.old_path+'/', 'HEAD', 'manual');
  report.old_domain_checks.push({path:item.old_path,status:old.status,location:old.location,is_new_domain_redirect:(old.location||'').startsWith(ORIGIN)});
 }
 report.checked=items.length;
 const keys=['redirect301','redirectDestination','destinationHTTP','title','description','canonical'];
 report.summary=Object.fromEntries(keys.map(k=>[k,{passed:tested.filter(x=>x.checks[k]).length,total:tested.length}]));
 report.failures=tested.filter(x=>!x.pass).map(x=>({from:x.old_path,to:x.new_path,status:x.redirect_status,location:x.redirect_location,checks:x.checks,actualTitle:x.seo.title,actualDescription:x.seo.description,expectedTitle:x.title,expectedDescription:x.description}));
 report.status=report.failures.length===0?'PASS':'FAIL';
 report.end=new Date().toISOString();save();
 console.log('AQUA_MENU_SEO_PRODUCTION_SUMMARY='+JSON.stringify({status:report.status,...report.summary,failures:report.failures.slice(0,10),old_domain:report.old_domain_checks}));
 assert(report.status==='PASS',report.failures.length+' SEO/redirect checks failed');
})().catch(e=>{report.status='FAIL';report.error=String(e.stack||e).slice(0,500);save();console.error('AQUA_MENU_SEO_PRODUCTION_FAIL='+String(e.message||e));process.exitCode=1;});
