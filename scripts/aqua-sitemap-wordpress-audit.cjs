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
  cmsCommon:base+'/data/cms-common.json',
  cmsProducts:base+'/data/cms-products.json',
  publishedPosts:wp+'/wp-json/wp/v2/posts?per_page=4&status=publish&_fields=id,slug,link,yoast_head_json',
  publishedPages:wp+'/wp-json/wp/v2/pages?per_page=4&status=publish&_fields=id,slug,acf,yoast_head_json',
  publishedCategories:wp+'/wp-json/wp/v2/categories?per_page=4&_fields=id,slug,count',
  releaseMarker:base+'/aquathanhxuan-staging-build.json',
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
 const common=(()=>{try{return JSON.parse(results.cmsCommon.text)}catch{return null}})();
 const products=(()=>{try{return JSON.parse(results.cmsProducts.text)}catch{return null}})();
 const posts=(()=>{try{return JSON.parse(results.publishedPosts.text)}catch{return null}})();
 const pages=(()=>{try{return JSON.parse(results.publishedPages.text)}catch{return null}})();
 const cats=(()=>{try{return JSON.parse(results.publishedCategories.text)}catch{return null}})();
 const disallowAll=/^\s*Disallow:\s*\/\s*$/mi.test(robots);
 const sitemapDeclarations=robots.split(/\r?\n/).filter(s=>/^\s*Sitemap\s*:/i.test(s));
 const privatePaths=['/cart','/checkout','/order-received','/lich-su-mua-hang','/quen-mat-khau','/dat-lai-mat-khau','/trang-chu'];
 const privateInSitemap=privatePaths.filter(p=>urls.includes(base+p));
 const foreignInSitemap=urls.filter(url=>!url.startsWith(base+'/'));
 const marker=(()=>{try{return JSON.parse(results.releaseMarker.text)}catch{return null}})();
 const samplePaths=['/','/san-pham','/gioi-thieu','/lien-he','/san-pham/atman','/san-pham/may-loc-atman','/san-pham/continuum-aquatics-bact-rox-l-1lit-vat-lieu-loc-nuoc-cao-cap','/san-pham/den-uv-30w'];
 const samples=await Promise.all(samplePaths.map(async p=>{
  if(!urls.includes(base+p))return {path:p,missingFromSitemap:true};
  try{const response=await fetch(base+p,{redirect:'manual',headers:{accept:'text/html'},signal:AbortSignal.timeout(20000)});await response.body?.cancel();return {path:p,status:response.status,location:response.headers.get('location')||null};}
  catch(e){return {path:p,error:String(e.message||e)}}
 }));
 const report={
   at:new Date().toISOString(),
   checks:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{status:v.status,url:v.url,contentType:v.contentType,bytes:v.bytes,durationMs:v.durationMs,error:v.error||null}])),
   wordpressSettings:source?{version:source.version,site:source.site,mode:source.sitemap?.mode,extra:source.sitemap?.extra,exclude:source.sitemap?.exclude,manualXmlLength:(source.sitemap?.xml||'').length,robots:source.robots,llmsLength:(source.llms||'').length}:null,
   sitemap:{count:urls.length,unique:unique.length,hosts,homepage:urls.includes(base+'/'),hasUrlset:/<urlset\b/.test(xml),hasEndUrlset:/<\/urlset>/.test(xml),hasIndex:/<sitemapindex\b/.test(xml),sampleFirst:urls.slice(0,15),sampleLast:urls.slice(-8)},
   validation:{privateInSitemap,foreignInSitemap,releaseMarker:marker,samples},
   robots:{disallowAll,sitemaps:sitemapDeclarations,firstLines:robots.split(/\r?\n/).slice(0,18)},
   cms:{pagesCount:common?.pages?.length||null, pagesSample:(common?.pages||[]).slice(0,18).map(p=>({key:p.key,slug:p.slug,lang:p.lang,action:p.action,ssr:p.ssr})),uniquePageKeys:[...new Set((common?.pages||[]).map(p=>p.key))].slice(0,65),productCategoryCount:common?.productCategories?.length||null,categoriesSample:(common?.productCategories||[]).slice(0,5).map(c=>({id:c.id,slug:c.slug,parent:c.parent})),productCount:products?.length||null,productSample:(products||[]).slice(0,6).map(p=>({_id:p._id,slug:p.slug,slugP:p.slugP,keys:Object.keys(p).slice(0,16)})),wpPosts:posts,wpPages:pages,wpCategories:cats},
   yoastSnippet:results.wordpressYoast.text.slice(0,180),
   wordpressCoreSnippet:results.wordpressCoreSitemap.text.slice(0,180)
 };
 fs.mkdirSync('artifacts/aqua-sitemap',{recursive:true});
 fs.writeFileSync('artifacts/aqua-sitemap/audit.json',JSON.stringify(report,null,2));
 console.log('SITEMAP_AUDIT='+JSON.stringify(report));
 const checks=[
  ['release_sha',marker?.commit==='59268917073c71cc55ff67b31333f45df00d8498'],
  ['sitemap_http',results.frontendSitemap.status===200],
  ['sitemap_xml',report.sitemap.hasUrlset&&report.sitemap.hasEndUrlset],
  ['expected_urls',urls.length===563&&unique.length===563],
  ['canonical_host',foreignInSitemap.length===0],
  ['private_urls_excluded',privateInSitemap.length===0],
  ['wordpress_auto',source?.sitemap?.mode==='auto'&&source?.site===base],
  ['robots_canonical',results.frontendRobots.status===200&&!disallowAll&&sitemapDeclarations.length===1&&sitemapDeclarations[0].trim()==='Sitemap: '+base+'/sitemap.xml'&&!/ptscps|thegioihosting/i.test(robots)],
  ['llms_no_foreign_site',!(/ptscps|thegioihosting/i.test(source?.llms||''))],
  ['live_routes',samples.every(x=>x.status===200)],
 ];
 report.validation.checks=checks;
 report.validation.status=checks.every(([,ok])=>ok)?'PASS':'FAIL';
 console.log('SITEMAP_RELEASE_VERIFICATION='+JSON.stringify(report.validation));
 if(report.validation.status!=='PASS')process.exitCode=2;
})().catch(e=>{console.error('SITEMAP_AUDIT_ERROR '+String(e.stack||e));process.exitCode=1});
