'use strict';
/** READ-ONLY source/target/menu metadata + redirects inventory. NO CMS WRITES. */
const fs=require('node:fs');
const OLD='https://aquathanhxuan.com';
const NEW='https://aquathanhxuan.io.vn';
const WP='https://admin.aquathanhxuan.io.vn';
const OUT='artifacts/aqua-menu-seo-audit';
fs.mkdirSync(OUT,{recursive:true});
const report={scope:'ALL_ORIGINAL_HEADER_MENU_CATEGORY_LINKS',source:OLD,target:NEW,started_at:new Date().toISOString(),entries:[],errors:[]};
const save=()=>fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');
const sleep=t=>new Promise(r=>setTimeout(r,t));
const decode=s=>String(s||'').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#039;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+/g,' ').trim();
async function probe(input,method='GET',follow=false){
 const url=new URL(input);
 try{
  const r=await fetch(url,{method,redirect:follow?'follow':'manual',signal:AbortSignal.timeout(14000),headers:{'User-Agent':'Mozilla/5.0 (compatible; AquaSeoAudit/1.0)','Accept':'text/html,application/json;q=0.9'}});
  const html=method==='HEAD'?'':await r.text();
  return {status:r.status,location:r.headers.get('location')||'',finalUrl:r.url,html:html.slice(0,240000)};
 }catch(e){return {status:0,error:String(e.message||e).slice(0,140),html:''};}
}
function meta(html){
 const title=decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const m=html.match(/<meta\s+[^>]*name\s*=\s*["']description["'][^>]*>/i)?.[0]
 || html.match(/<meta\s+[^>]*content\s*=\s*["'][^"']*["'][^>]*name\s*=\s*["']description["'][^>]*>/i)?.[0]||'';
 return {title,description:decode(m.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]||'')};
}
function links(html){
 const a=[];
 const re=/<a\b[^>]*\bhref=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;let m;
 while((m=re.exec(html))){
  try{
   const url=new URL(decode(m[2]),OLD);
   if(url.hostname!=='aquathanhxuan.com'||!url.pathname.startsWith('/danh-muc/'))continue;
   const label=decode(m[3].replace(/<[^>]+>/g,''));
   if(label)a.push({old_path:decodeURIComponent(url.pathname).replace(/\/+$/,'')||'/',label});
  }catch{}
 }
 const seen=new Map();for(const item of a)if(!seen.has(item.old_path))seen.set(item.old_path,item);return [...seen.values()];
}
async function pool(entries,fn,limit=7){let i=0;await Promise.all(Array.from({length:Math.min(limit,entries.length)},async()=>{while(i<entries.length){const k=i++;await fn(entries[k],k);}}))}
(async()=>{
 const [source,menuResponse,categoriesResponse]=await Promise.all([probe(OLD),probe(WP+'/wp-json/esc-api/v1/menus'),probe(WP+'/wp-json/astro/v1/get-product-categories')]);
 if(categoriesResponse.status===200){try{report.wp_categories=JSON.parse(categoriesResponse.html)}catch(e){report.errors.push('Invalid categories JSON: '+String(e))}}else report.errors.push('WP categories HTTP '+categoriesResponse.status);
 if(source.status!==200)throw Error('Original homepage HTTP '+source.status+': '+source.error);
 report.old_home=meta(source.html);
 if(menuResponse.status===200){
  const payload=JSON.parse(menuResponse.html);const head=payload.menus?.Header?.vi;
  report.wp_header_menu=(head?.items||[]).map(item=>({title:item.title||item.label||item.name||'',url:item.url||item.href||item.link||'',children:(item.children||[]).length}));
  const flatten=(items,depth=0)=>{
    const list=[];for(const item of items||[]){
     list.push({label:item.title||item.label||item.name||'',href:item.url||item.href||item.link||'',slug:item.slug||'',depth});
     list.push(...flatten(item.children,depth+1));
    }return list;
  };report.wp_header_all=flatten(head?.items);
 }else{report.errors.push('WP menu response '+menuResponse.status+': '+menuResponse.error)}
 let legacy=links(source.html);
 if(legacy.length<9)throw Error('Failed to extract original category menu: '+legacy.length);
 report.legacy_menu_count=legacy.length;
 report.entries=legacy.map(x=>({...x}));
 await pool(report.entries,async(row,index)=>{
   const slug=row.old_path.split('/').filter(Boolean).slice(-1)[0];
   const rootCandidate='/san-pham/'+slug;
   const [o,n,legacyNew,oldDomainNewPath]=await Promise.all([
     probe(OLD+row.old_path,'GET',true),probe(NEW+rootCandidate),
     probe(NEW+row.old_path,'HEAD'),probe(OLD+rootCandidate,'HEAD')
   ]);
   row.old={status:o.status,location:o.location,...meta(o.html)};
   row.new={path:rootCandidate,status:n.status,location:n.location,...meta(n.html)};
   row.redirect_new_legacy={status:legacyNew.status,location:legacyNew.location,error:legacyNew.error||''};
   row.old_domain_redirect={status:oldDomainNewPath.status,location:oldDomainNewPath.location,error:oldDomainNewPath.error||''};
   if(index%10===0)console.log('AQUA_MENU_SEO_AUDIT_PROGRESS='+JSON.stringify({done:index+1,total:report.entries.length,path:row.old_path,new:row.new.status,redirect:row.redirect_new_legacy.status}));
 },6);
 report.summary={
  total:report.entries.length,
  source_valid:report.entries.filter(x=>x.old?.status===200).length,
  target_valid:report.entries.filter(x=>x.new?.status===200).length,
  redirect_legacy_301:report.entries.filter(x=>[301,308].includes(x.redirect_new_legacy?.status)).length,
  redirect_legacy_404:report.entries.filter(x=>x.redirect_new_legacy?.status===404).length,
  source_title_mismatch:report.entries.filter(x=>x.old?.title&&x.new?.title&&x.old.title!==x.new.title).length,
  source_desc_available:report.entries.filter(x=>x.old?.description).length,
  new_desc_available:report.entries.filter(x=>x.new?.description).length,
 };
 report.finished_at=new Date().toISOString();
 save();console.log('AQUA_MENU_SEO_AUDIT_SUMMARY='+JSON.stringify(report.summary));
 console.log('AQUA_MENU_SEO_ROOTS='+JSON.stringify(report.entries.filter(x=>x.old_path.split('/').length===3).slice(0,15).map(({label,old_path,old,new:n,redirect_new_legacy:r})=>({label,old_path,oldTitle:old?.title,oldDesc:old?.description,oldStatus:old?.status,newTitle:n?.title,newDesc:n?.description,newStatus:n?.status,redirect:r?.status,location:r?.location}))));
})().catch(e=>{report.errors.push(String(e.stack||e));save();console.error('AQUA_MENU_SEO_AUDIT_FAIL='+String(e.message||e));process.exitCode=1;});
