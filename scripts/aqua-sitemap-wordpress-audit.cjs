'use strict';
const fs=require('node:fs');
const {URL}=require('node:url');
const base='https://aquathanhxuan.io.vn', wp='https://admin.aquathanhxuan.io.vn';
const targets={
  frontendSitemap:base+'/sitemap.xml',
  frontendRobots:base+'/robots.txt',
  wordpressSeoSource:wp+'/wp-json/esc-seo-files/v1/public',
  wordpressYoast:wp+'/sitemap_index.xml',
  wordpressCoreSitemap:wp+'/wp-sitemap.xml',
};
async function check(url){
  const start=Date.now();
  try{
    const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'AquaSitemapReadonlyQA/1.0',accept:'application/xml,text/xml,application/json,text/plain,*/*'},signal:AbortSignal.timeout(26000)});
    const t=await r.text();
    return {status:r.status,url:r.url,contentType:r.headers.get('content-type'),bytes:Buffer.byteLength(t),durationMs:Date.now()-start,text:t};
  }catch(e){return {status:0,url,error:String(e.message||e),durationMs:Date.now()-start,text:''}}
}
(async()=>{
 const results=Object.fromEntries(await Promise.all(Object.entries(targets).map(async([k,u])=>[k,await check(u)])));
 const xml=results.frontendSitemap.text;
 const urls=[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].trim());
 const unique=[...new Set(urls)];
 const hosts=Object.entries(urls.reduce((a,u)=>{try{const z=new URL(u);a[z.host]=(a[z.host]||0)+1}catch{a.invalid=(a.invalid||0)+1}return a},{}));
 const source=(()=>{try{return JSON.parse(results.wordpressSeoSource.text)}catch{return null}})();
 const robots=results.frontendRobots.text;
 const disallowAll=/^\s*Disallow:\s*\/\s*$/mi.test(robots);
 const sitemapDeclarations=robots.split(/\r?\n/).filter(s=>/^\s*Sitemap\s*:/i.test(s));
 const report={
   at:new Date().toISOString(),
   checks:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{status:v.status,url:v.url,contentType:v.contentType,bytes:v.bytes,durationMs:v.durationMs,error:v.error||null}])),
   wordpressSettings:source?{version:source.version,site:source.site,mode:source.sitemap?.mode,extra:source.sitemap?.extra,exclude:source.sitemap?.exclude,manualXmlLength:(source.sitemap?.xml||'').length,robots:source.robots,llmsLength:(source.llms||'').length}:null,
   sitemap:{count:urls.length,unique:unique.length,hosts,homepage:urls.includes(base+'/'),hasUrlset:/<urlset\b/.test(xml),hasEndUrlset:/<\/urlset>/.test(xml),hasIndex:/<sitemapindex\b/.test(xml),sampleFirst:urls.slice(0,15),sampleLast:urls.slice(-8)},
   robots:{disallowAll,sitemaps:sitemapDeclarations,firstLines:robots.split(/\r?\n/).slice(0,18)},
   yoastSnippet:results.wordpressYoast.text.slice(0,180),
   wordpressCoreSnippet:results.wordpressCoreSitemap.text.slice(0,180)
 };
 fs.mkdirSync('artifacts/aqua-sitemap',{recursive:true});
 fs.writeFileSync('artifacts/aqua-sitemap/audit.json',JSON.stringify(report,null,2));
 console.log('SITEMAP_AUDIT='+JSON.stringify(report));
 if(results.frontendSitemap.status!==200||!report.sitemap.hasUrlset||urls.length<1)process.exitCode=2;
})().catch(e=>{console.error('SITEMAP_AUDIT_ERROR '+String(e.stack||e));process.exitCode=1});
