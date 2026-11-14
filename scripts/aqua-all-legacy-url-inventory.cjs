'use strict';
/**
 * READ-ONLY inventory of source Aqua URLs against the new Astro origin.
 * Enumerate indexed WordPress public URLs and linked archive URLs, then
 * verify HTTP status / Location without triggering checkout or modifying CMS.
 */
const fs = require('node:fs');
const OLD = 'https://aquathanhxuan.com';
const NEW = 'https://aquathanhxuan.io.vn';
const WP = 'https://admin.aquathanhxuan.io.vn';
const DIR = 'artifacts/aqua-all-legacy-url-inventory';
fs.mkdirSync(DIR, {recursive:true});
const result = {
  started_at:new Date().toISOString(), source:OLD, target:NEW,
  scope:'source sitemap + public WordPress REST + archive link discovery',
  sitemap:{seeded:[],found:[],successful:[],errors:[]},
  rest:{endpoints:[],counts:{}}, discovery:{html_scanned:0,html_errors:[],archive_limit_hit:false},
  http:{tested:0}, rows:[], errors:[], status:'STARTED'
};
const found = new Map();
const norm = s => {
  try {
    const u = new URL(String(s||''),OLD);
    if(!['http:','https:'].includes(u.protocol)||u.hostname!=='aquathanhxuan.com') return null;
    if(/\/(?:wp-admin|wp-json|wp-content|feed|comments|xmlrpc.php)(?:\/|$)/i.test(u.pathname)) return null;
    if(/\.(?:png|jpe?g|webp|svg|gif|css|js|xml|txt|pdf|zip|woff2?|ico|mp4|mp3)$/i.test(u.pathname)) return null;
    return (u.pathname.replace(/\/+$/,'') || '/');
  } catch { return null; }
};
function add(raw, source) {
  const path=norm(raw);
  if(!path) return;
  if(!found.has(path)) found.set(path,new Set());
  found.get(path).add(source);
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function decode(s){return String(s||'').replace(/&amp;/gi,'&').replace(/&#0*38;/gi,'&').replace(/&quot;/gi,'"').replace(/&#0*39;/gi,"'");}
async function request(url, options={}) {
  let last;
  for(let i=0;i<3;i++){
    try {
      const r=await fetch(url,{
        method:options.method || 'GET',
        redirect:options.follow?'follow':'manual',
        headers:{'User-Agent':'Mozilla/5.0 (compatible; AquaLegacyReadOnly/1.0)','Accept':options.accept||'text/html,application/xml,application/json;q=0.9','Cache-Control':'no-cache'},
        signal:AbortSignal.timeout(options.timeout||17000)
      });
      if([429,502,503,504].includes(r.status) && i<2){await sleep(600*(i+1));continue;}
      const body=options.method==='HEAD'?'':(await r.text()).slice(0,8_000_000);
      return {status:r.status,url:r.url,location:r.headers.get('location')||'',headers:r.headers,body};
    } catch(e){last=String(e.message||e);if(i<2)await sleep(450*(i+1));}
  }
  return {status:0,url,location:'',body:'',error:last||'network error',headers:new Headers()};
}
async function pool(items,fn,size=8) {
  let pos=0;await Promise.all(Array.from({length:Math.min(size,items.length)},async()=>{
    for(;;){const i=pos++;if(i>=items.length)break;await fn(items[i],i);}
  }));
}
function save() {
  fs.writeFileSync(DIR+'/report.json',JSON.stringify(result,null,2)+'\n');
}
function csv(rows) {
  const keys=['path','source','kind','http_status','location','target_status','expected','result','details'];
  const quote=x=>'"'+String(x??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
  fs.writeFileSync(DIR+'/urls.csv',[keys.join(','),...rows.map(row=>keys.map(k=>quote(row[k])).join(','))].join('\n')+'\n');
}
function xmlLocs(xml,tag) {
  const out=[];
  const re=new RegExp('<'+tag+'\\b[^>]*>[\\s\\S]*?<loc\\b[^>]*>([\\s\\S]*?)<\\/loc>[\\s\\S]*?<\\/'+tag+'>','gi');
  let match;while((match=re.exec(xml))!==null)out.push(decode(match[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim()));
  return out;
}
async function discoverSitemaps() {
  const queue=[
    OLD+'/sitemap_index.xml',OLD+'/wp-sitemap.xml',OLD+'/sitemap.xml',
    OLD+'/product-sitemap.xml',OLD+'/post-sitemap.xml',OLD+'/page-sitemap.xml',
    OLD+'/product_cat-sitemap.xml',OLD+'/category-sitemap.xml',
    OLD+'/wp-sitemap-posts-product-1.xml',OLD+'/wp-sitemap-posts-post-1.xml',
    OLD+'/wp-sitemap-posts-page-1.xml',OLD+'/wp-sitemap-taxonomies-product_cat-1.xml'
  ];
  result.sitemap.seeded=queue;
  const robots=await request(OLD+'/robots.txt');
  for(const m of robots.body.matchAll(/^sitemap:\s*(\S+)/gim))queue.push(m[1]);
  const seen=new Set();
  for(let batch=0;queue.length && batch<60;batch++){
    const urls=queue.splice(0,5).filter(u=>{
      try{
        const x=new URL(u,OLD);
        if(x.hostname!=='aquathanhxuan.com' || seen.has(x.href) || !/\.xml(?:\?.*)?$/i.test(x.href))return false;
        seen.add(x.href);return true;
      }catch{return false;}
    });
    if(!urls.length)continue;
    await Promise.all(urls.map(async u=>{
      const r=await request(u,{accept:'application/xml,text/xml,*/*',timeout:25000});
      if(r.status===200 && /<\s*(?:\?xml|urlset|sitemapindex|url|sitemap)\b/i.test(r.body.slice(0,350))){
        result.sitemap.successful.push({url:u,url_count:xmlLocs(r.body,'url').length});
        for(const item of xmlLocs(r.body,'url')) add(item,'sitemap');
        for(const item of xmlLocs(r.body,'sitemap'))queue.push(item);
      } else {
        result.sitemap.errors.push({url:u,status:r.status,why:r.error||'not XML sitemap'});
      }
    }));
  }
  if(queue.length)result.errors.push('Sitemap crawl exceeded 300 index pages; see remaining queue');
  result.sitemap.found=[...seen];
}
async function discoverRest() {
  const endpoints=[
    OLD+'/wp-json/wp/v2/posts',
    OLD+'/wp-json/wp/v2/pages',
    OLD+'/wp-json/wp/v2/product',
    OLD+'/wp-json/wp/v2/product_cat',
    OLD+'/wp-json/wp/v2/categories',
  ];
  await pool(endpoints,async base=>{
    const first=await request(base+'?per_page=100&page=1&_fields=id,link,slug,modified',{accept:'application/json'});
    let list=[];try{list=JSON.parse(first.body)}catch{}
    const maxPages=Math.min(200,Number(first.headers.get('x-wp-totalpages')||1));
    result.rest.endpoints.push({url:base,status:first.status,count:Number(first.headers.get('x-wp-total')||0),pages:maxPages});
    if(first.status!==200||!Array.isArray(list))return;
    for(const row of list)if(row.link)add(row.link,'wp-rest');
    const pages=Array.from({length:Math.max(0,maxPages-1)},(_,i)=>i+2);
    await pool(pages,async n=>{
      const r=await request(base+'?per_page=100&page='+n+'&_fields=id,link,slug',{accept:'application/json'});
      if(r.status!==200){result.errors.push('REST page '+r.status+': '+base+' page '+n);return;}
      try{const rows=JSON.parse(r.body);for(const row of rows)if(row.link)add(row.link,'wp-rest');}catch{result.errors.push('REST invalid JSON: '+base+' page '+n);}
    },5);
  },3);
}
async function discoverStoreApi() {
  // WooCommerce Store API enumerates published storefront products even when
  // Yoast sitemap is disabled. Track its server-advertised total separately.
  const endpoints=[
    {base:OLD+'/wp-json/wc/store/v1/products',name:'store_products',max:400},
    {base:OLD+'/wp-json/wc/store/v1/products/categories',name:'store_categories',max:50},
  ];
  for(const endpoint of endpoints) {
    const base=endpoint.base;
    let page=1,total=0,pages=0;
    let expected=null,broken=false;
    while(page<=endpoint.max) {
      const response=await request(base+'?per_page=100&page='+page,{accept:'application/json',timeout:26000});
      let items;try{items=JSON.parse(response.body)}catch{}
      if(response.status===400 && page>1 && total>0)break;
      if(response.status!==200||!Array.isArray(items)) {
        result.errors.push('Store API '+endpoint.name+' HTTP '+response.status+' page '+page);
        broken=true;break;
      }
      if(page===1) {
        const raw=response.headers.get('x-wp-total');
        expected=raw===null?null:Number(raw);
      }
      for(const item of items) {
        const url=String(item.permalink||item.link||'');
        if(url) add(url,endpoint.name);
        else if(endpoint.name==='store_products' && item.slug) {
          // WordPress legacy permalink was /san-pham/{product-slug}.
          add(OLD+'/san-pham/'+encodeURIComponent(item.slug),endpoint.name+'-slug');
        }
      }
      total+=items.length;pages++;
      if(page%10===0)console.log('AQUA_ALL_LEGACY_STORE_PROGRESS='+JSON.stringify({endpoint:endpoint.name,page,items:total,expected}));
      const maxPages=Number(response.headers.get('x-wp-totalpages')||0);
      if((maxPages&&page>=maxPages)||items.length<100)break;
      page++;
    }
    if(page>endpoint.max) {
      result.errors.push('Store API '+endpoint.name+' exceeded page cap '+endpoint.max);
      broken=true;
    }
    result.rest[endpoint.name]={count:total,pages,reported_total:expected,complete:!broken&&(expected===null||total>=expected)};
  }
}

function links(html) {
  const values=[];const re=/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi;
  for(const m of html.matchAll(re)){
    try {
      const u=new URL(decode(m[2]),OLD);
      if(u.hostname==='aquathanhxuan.com'&&/^https?:$/.test(u.protocol))values.push(u);
    }catch{}
  }
  return values;
}
function isArchive(path) {
  return path==='/' || path==='/danh-muc' || path==='/shop' ||
    /^\/(?:danh-muc|category|tag|shop)(?:\/|$)/.test(path) ||
    /^\/(?:san-pham|blog|tin-tuc)\/page\/\d+$/.test(path);
}
async function discoverHtml() {
  const seeds=['/','/danh-muc','/shop','/blog','/tin-tuc','/category'];
  for(const path of found.keys())if(isArchive(path))seeds.push(path);
  const queue=[...new Set(seeds)],seen=new Set();let pos=0;
  const maxArchive=1600;
  await Promise.all(Array.from({length:6},async()=>{
    for(;;) {
      const item=queue[pos++];
      if(!item)break;
      if(seen.has(item))continue;
      if(seen.size>=maxArchive){result.discovery.archive_limit_hit=true;break;}
      seen.add(item);
      const response=await request(OLD+item,{accept:'text/html',timeout:21000,follow:true});
      if(response.status!==200||!response.body.includes('<a')) {
        if(response.status!==404)result.discovery.html_errors.push({path:item,status:response.status,error:response.error||''});
        continue;
      }
      result.discovery.html_scanned++;
      for(const u of links(response.body)) {
        const path=norm(u.href);
        if(!path)continue;
        add(u.href,'html-link');
        if(isArchive(path) && !seen.has(path) && !queue.includes(path) && queue.length<maxArchive*8)queue.push(path);
      }
    }
  }));
  result.discovery.html_archive_count=seen.size;
}
async function fetchNewCategories() {
  const r=await request(WP+'/wp-json/astro/v1/get-product-categories',{accept:'application/json'});
  try{
    const list=JSON.parse(r.body);
    if(Array.isArray(list)){
      result.rest.new_categories=list.length;
      return new Set(list.map(x=>String(x.slug||'')).filter(Boolean));
    }
  }catch{}
  result.errors.push('New Woo taxonomy unavailable HTTP '+r.status);
  return new Set();
}
async function fetchPublishedRules() {
  const all=[];
  const base=WP+'/wp-json/wp/v2/chuyen-huong-link?status=publish&per_page=100';
  const first=await request(base+'&page=1',{accept:'application/json'});
  let parsed;try{parsed=JSON.parse(first.body)}catch{}
  if(first.status!==200||!Array.isArray(parsed)){
    result.errors.push('Redirect CPT unavailable: HTTP '+first.status);
    return all;
  }
  all.push(...parsed);
  const totalPages=Math.min(200,Number(first.headers.get('x-wp-totalpages')||1));
  await pool(Array.from({length:Math.max(0,totalPages-1)},(_,i)=>i+2),async n=>{
    const res=await request(base+'&page='+n,{accept:'application/json'});
    try{const data=JSON.parse(res.body);if(Array.isArray(data))all.push(...data);else result.errors.push('Redirect CPT invalid page '+n);}
    catch{result.errors.push('Redirect CPT HTTP '+res.status+' page '+n);}
  },5);
  result.rest.published_redirect_records=all.length;
  fs.writeFileSync(DIR+'/published-redirect-rules.json',JSON.stringify(all.map(x=>({id:x.id,from:x.acf?.from_link||'',to:x.acf?.to_link||'',type:x.acf?.type||'',enabled:x.acf?.enable===true,status:x.status})),null,2)+'\n');
  return all;
}
async function audit() {
  const categories=await fetchNewCategories();
  const rules=await fetchPublishedRules();
  const savedFrom=new Map();
  for(const r of rules) {
    const from=norm(OLD+String(r.acf?.from_link||''));
    if(from && r.acf?.enable===true)savedFrom.set(from,{to:r.acf?.to_link||'',type:String(r.acf?.type||'')});
  }
  // Add every active CMS redirect source to inventory (even if not linked from menus or sitemap).
  for(const from of savedFrom.keys())add(OLD+from,'cms-redirect');
  // Common old public navigation URLs absent from sitemaps.
  for(const path of ['/','/danh-muc','/cart','/checkout','/my-account','/tai-khoan','/gio-hang','/lien-he','/gioi-thieu'])add(OLD+path,'navigation');
  const paths=[...found.keys()].sort();
  result.discovery.unique_urls=paths.length;
  console.log('AQUA_ALL_LEGACY_DISCOVERY='+JSON.stringify({
    unique:paths.length,sitemaps:result.sitemap.successful.length,rest:result.rest.endpoints,
    archived:result.discovery.html_scanned,redirectRules:savedFrom.size,
  }));
  const rows=new Array(paths.length);
  await pool(paths,async(path,i)=>{
    const originalSources=[...found.get(path)];
    const oldCategory=path.startsWith('/danh-muc/');
    const slug=decodeURIComponent(path.split('/').pop()||'');
    const saved=savedFrom.get(path);
    // A verified CMS route may intentionally point to a renamed taxonomy slug.
    // Prefer the published exact mapping over naive last-segment replacement.
    const expected=oldCategory && saved?.type==='301' ? String(saved.to) :
      (oldCategory && categories.has(slug)?'/san-pham/'+encodeURIComponent(slug):'');
    let r=await request(NEW+path,{method:'HEAD'});
    if([0,405,501].includes(r.status))r=await request(NEW+path,{method:'GET'});
    let destination='',target_status=0;
    if(r.location){try{destination=new URL(r.location,NEW).toString()}catch{destination='INVALID'};}
    const redirected=[301,302,307,308].includes(r.status);
    if(redirected && destination!=='INVALID'){
      const dst=await request(destination,{method:'HEAD'});
      target_status=dst.status;
      if([0,405,501].includes(target_status)){
        target_status=(await request(destination,{method:'GET'})).status;
      }
    }
    let kind=oldCategory?'legacy_category':path.startsWith('/san-pham/')?'product_or_category':
      path.startsWith('/category/')?'post_category':path.startsWith('/tag/')?'tag':'page_or_archive';
    let verdict='REVIEW';
    if(expected){
      if(r.status===301&&destination===NEW+expected&&target_status===200)verdict='PASS_301';
      else verdict='FAIL_EXPECTED_301';
    } else if(r.status===200) verdict='OK_SAME_PATH_200';
    else if(r.status===301&&destination.startsWith(NEW+'/')&&target_status===200)verdict='PASS_301_OTHER';
    else if(redirected)verdict='REVIEW_REDIRECT';
    else if([404,410].includes(r.status))verdict='MISSING_404';
    else if(r.status>=500||r.status===0)verdict='ERROR';
    else verdict='REVIEW_STATUS';
    const mismatch=saved && saved.type==='301' && r.status!==301;
    if(mismatch&&verdict!=='FAIL_EXPECTED_301')verdict='FAIL_CMS_301_NOT_LIVE';
    rows[i]={
      path,source:originalSources.join(';'),kind,http_status:r.status,location:r.location,
      target_status,expected,saved_rule:saved||null,result:verdict,
      details:mismatch?'Published WordPress 301 exists but HTTP not 301':(r.error||'')
    };
    if(i%200===0) console.log('AQUA_ALL_LEGACY_PROGRESS='+JSON.stringify({done:i+1,total:paths.length,path,status:r.status,verdict}));
    result.http.tested++;
    if(result.http.tested%300===0){result.rows=rows.filter(Boolean);save();csv(result.rows);}
  },12);
  result.rows=rows;
  result.summary={
    total:rows.length,
    by_type:Object.fromEntries([...new Set(rows.map(x=>x.kind))].map(k=>[k,rows.filter(x=>x.kind===k).length])),
    by_result:Object.fromEntries([...new Set(rows.map(x=>x.result))].map(k=>[k,rows.filter(x=>x.result===k).length])),
    sitemap_urls:[...found].filter(([,v])=>v.has('sitemap')).length,
    rest_urls:[...found].filter(([,v])=>v.has('wp-rest')).length,
    link_urls:[...found].filter(([,v])=>v.has('html-link')).length,
    expected_category_301:rows.filter(x=>x.expected).length,
    cms_redirect_sources:savedFrom.size,
    discoveries_complete:!result.discovery.archive_limit_hit&&!result.errors.some(s=>s.includes('exceeded')) && result.rest.store_products?.complete===true
  };
  result.status='AUDIT_COMPLETE';
  result.finished_at=new Date().toISOString();
  save();csv(rows);
  console.log('AQUA_ALL_LEGACY_SUMMARY='+JSON.stringify(result.summary));
  console.log('AQUA_ALL_LEGACY_GAPS='+JSON.stringify(rows.filter(x=>/FAIL|MISSING|ERROR|REVIEW/.test(x.result)).slice(0,30)));
}
(async()=>{try{
  await discoverSitemaps();
  console.log('AQUA_ALL_LEGACY_SITEMAPS='+JSON.stringify({good:result.sitemap.successful.length,urls:found.size}));
  await discoverRest();
  await discoverStoreApi();
  await discoverHtml();
  await audit();
}catch(e){result.status='FAILED';result.errors.push(String(e.stack||e).slice(0,1600));save();console.error('AQUA_ALL_LEGACY_FATAL='+String(e.message||e));process.exitCode=1;}})();