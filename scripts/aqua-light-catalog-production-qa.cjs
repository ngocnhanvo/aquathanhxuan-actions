'use strict';
/** Read-only WooCommerce + production Astro parity QA for the seven original Đèn categories. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const SOURCE='https://aquathanhxuan.com';
const DEST='https://admin.aquathanhxuan.io.vn';
const PUBLIC='https://aquathanhxuan.io.vn';
const CONFIG=JSON.parse(fs.readFileSync(process.env.LIGHT_QA_REQUEST_PATH||'qa-requests/light-catalog-production.json','utf8'));
const dataOnly=process.env.LIGHT_QA_DATA_ONLY==='1';
assert(/^[0-9a-f]{40}$/.test(CONFIG.sha),'Must verify exact production commit');
const dir='artifacts/light-catalog-production';
fs.mkdirSync(dir,{recursive:true});
const report={source:SOURCE,target:DEST,production:PUBLIC,sha:CONFIG.sha,categories:[],checks:[],screenshots:[],status:'STARTED',started:new Date().toISOString()};
const save=()=>fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
save();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function retryRead(label,execute){
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const r=await execute();
   const status=typeof r.status==='function'?r.status():r.status;
   if([429,500,502,503,504].includes(status)&&attempt<3){
    console.log('LIGHT_READ_RETRY='+JSON.stringify({label,attempt,status}));
    await sleep(800*attempt);continue;
   }
   assert.equal(status,200,label+' HTTP '+status);
   return r;
  }catch(error){
   const transient=/ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|fetch failed|network|TimeoutError|ECONNREFUSED/i.test(String(error));
   if(!transient||attempt===3)throw error;
   console.log('LIGHT_READ_RETRY='+JSON.stringify({label,attempt,error:String(error).slice(0,160)}));
   await sleep(800*attempt);
  }
 }
 throw Error('LIGHT_READ_RETRY_EXHAUSTED '+label);
}
async function sourceJSON(path){
 const r=await retryRead('Source '+path,()=>fetch(SOURCE+path,{
  signal:AbortSignal.timeout(45000),headers:{'cache-control':'no-cache'}
 }));
 return r.json();
}
async function sourcePaged(path,category){
 const all=[];
 for(let i=1;i<=25;i++){
  const rows=await sourceJSON(path+(path.includes('?')?'&':'?')+'per_page=100&page='+i+(category?'&category='+category:''));
  assert(Array.isArray(rows));all.push(...rows);
  if(rows.length<100)break;
 }
 return all;
}
async function deployMarker(){
 let actual='';
 const deadline=Date.now()+120000;
 do{
  try{
   const r=await fetch(PUBLIC+'/aquathanhxuan-staging-build.json?qa='+Date.now(),{signal:AbortSignal.timeout(15000),headers:{'cache-control':'no-cache'}});
   if(r.ok){const j=await r.json();actual=j.commit||'';if(actual===CONFIG.sha&&j.branch==='master')return}
  }catch{}
  await sleep(9000);
 }while(Date.now()<deadline);
 throw Error('LIGHT_DEPLOY_NOT_READY expected='+CONFIG.sha+' actual='+actual);
}
async function run(){
 if(!dataOnly){await deployMarker();console.log('LIGHT_DEPLOY_READY='+CONFIG.sha)}
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(DEST+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:65000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(x=>x.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nr=await page.request.get(DEST+'/wp-admin/admin-ajax.php?action=rest-nonce');
  assert.equal(nr.status(),200);
  const headers={'X-WP-Nonce':(await nr.text()).trim()};
  async function wc(path){
   const r=await retryRead('Target WooCommerce '+path,
     ()=>page.request.get(DEST+path,{headers,timeout:45000}));
   return r.json();
  }
  const sourceCategories=await sourcePaged('/wp-json/wc/store/v1/products/categories');
  const targetCategories=[];
  for(let p=1;p<=20;p++){
   const rows=await wc('/wp-json/wc/v3/products/categories?per_page=100&page='+p);
   assert(Array.isArray(rows));
   targetCategories.push(...rows);
   if(rows.length<100)break;
  }
  const expected=[
    ['Đèn','den',1546,1768,59],
    ['WeekAqua','den-weekaqua',1525,1813,4],
    ['Chihiros','den-chihiros',1482,1814,8],
    ['Neo Helios','neo-helios',1545,1815,7],
    ['Xuanmailong','xuanmailong',1526,1816,15],
    ['Kaokui','kaokui',2175,1817,2],
    ['Odyssea','odyssea',2176,1818,6],
    ['Phụ kiện đèn','den-phu-kien',1524,1792,7],
  ];
  const allowedDeferred=new Set(CONFIG.mediaDeferredSourceIds||[]);
  const observedDeferred=new Set();
  const seen=new Map();
  const seenDest=new Map();
  const expectedIdsByCategory=new Map();
  for(const [name,dslug,srcId,dstId,count] of expected){
   const sc=sourceCategories.find(x=>Number(x.id)===srcId);
   const dc=targetCategories.find(x=>Number(x.id)===dstId);
   assert(sc&&dc,'Missing category identity '+name);
   assert.equal(dc.slug,dslug,'Destination category slug changed '+name);
   assert.equal(Number(sc.parent||0),name==='Đèn'?0:1546);
   assert.equal(Number(dc.parent||0),name==='Đèn'?0:1768);
   const original=await sourcePaged('/wp-json/wc/store/v1/products',srcId);
   assert.equal(original.length,count,'Legacy category count drift '+name);
   const targetRows=await wc('/wp-json/wc/v3/products?per_page=100&status=publish&category='+dstId);
   assert(Array.isArray(targetRows));
   const mapped=new Map(targetRows.map(x=>[x.slug,x]));
   for(const item of original){
    const dst=mapped.get(item.slug);
    assert(dst,'Imported product missing from '+name+': '+item.slug);
    const origin=(dst.meta_data||[]).find(x=>x.key==='_esc_origin_product_id');
    assert.equal(String(origin?.value||''),String(item.id),'Original Product ID mismatch '+item.slug);
    assert.equal(String(dst.price||''),String(item.prices.price),'Price mismatch '+item.slug);
    assert.equal(dst.stock_status,item.is_in_stock?'instock':'outofstock','Stock status mismatch '+item.slug);
    assert((dst.categories||[]).some(x=>Number(x.id)===1768),'Root Đèn category not assigned '+item.slug);
    if(!(dst.images||[]).length){
      assert(allowedDeferred.has(Number(item.id)),'Missing original product media without source evidence '+item.slug);
      const marker=(dst.meta_data||[]).find(x=>x.key==='_esc_source_media_deferred');
      assert(marker?.value,'Missing explicit source media deferred record '+item.slug);
      observedDeferred.add(Number(item.id));
    }
    seen.set(item.slug,item);
    seenDest.set(item.slug,dst);
   }
   expectedIdsByCategory.set(dslug,new Set(original.map(x=>String(mapped.get(x.slug).id))));
   const item={name,sourceCount:count,targetCount:targetRows.length,sourceCategory:srcId,targetCategory:dstId,slug:dslug,missing:0};
   report.categories.push(item);
   console.log('LIGHT_CATEGORY_DATA_PASS='+JSON.stringify(item));save();
  }
  // Check real legacy HTML SEO metadata, not Product H1 or body-derived guesses.
  let seoTitleChecked=0,seoDescriptionChecked=0,seoTitleMissing=0,seoDescriptionMissing=0;
  for(const [slug,sourceProduct] of seen){
    const target=seenDest.get(slug);
    assert(target,'No destination to verify SEO '+slug);
    const response=await retryRead('Source SEO HTML '+slug,
      ()=>fetch(SOURCE+'/san-pham/'+encodeURIComponent(slug)+'/',{
        signal:AbortSignal.timeout(45000),headers:{'cache-control':'no-cache'},
      }));
    const head=(await response.text()).split('</head>')[0];
    const sourceSeo=await page.evaluate(head=>{
      const doc=new DOMParser().parseFromString(head+'</head>','text/html');
      return {
        title:String(doc.querySelector('title')?.textContent||'').replace(/\s+/g,' ').trim(),
        description:String(doc.querySelector('meta[name="description"]')?.getAttribute('content')||'').replace(/\s+/g,' ').trim(),
      };
    },head);
    const metaValue=key=>String((target.meta_data||[]).find(x=>x.key===key)?.value||'').replace(/\s+/g,' ').trim();
    if(sourceSeo.title){
      assert.equal(metaValue('_yoast_wpseo_title'),sourceSeo.title,'SEO title source mismatch '+slug);
      seoTitleChecked++;
    }else seoTitleMissing++;
    if(sourceSeo.description){
      assert.equal(metaValue('_yoast_wpseo_metadesc'),sourceSeo.description,'SEO description source mismatch '+slug);
      seoDescriptionChecked++;
    }else seoDescriptionMissing++;
    if(String(sourceProduct.description||'').trim())
      assert(String(target.description||'').trim(),'Source long description absent '+slug);
    if(String(sourceProduct.short_description||'').trim())
      assert(String(target.short_description||'').trim(),'Source short description absent '+slug);
  }
  console.log('LIGHT_SEO_SOURCE_TARGET_PASS='+JSON.stringify({total:seen.size,seoTitleChecked,seoDescriptionChecked,seoTitleMissing,seoDescriptionMissing}));
  assert.equal(seen.size,59,'Root + children unique total changed');
  console.log('LIGHT_WOO_PARITY_PASS='+JSON.stringify({unique:seen.size,categories:report.categories.length,mediaDeferred:[...observedDeferred]}));
  if(dataOnly){
    report.status='DATA_PASS';report.finished=new Date().toISOString();save();
    console.log('LIGHT_PREDEPLOY_DATA_PASS='+JSON.stringify({unique:seen.size,categories:report.categories.length,seoChecked:true,mediaDeferred:[...observedDeferred]}));
    return;
  }
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
   const tab=await context.newPage();
   const errors=[];
   tab.on('pageerror',error=>errors.push(String(error.message)));
   for(const c of report.categories){
    const url='/san-pham/'+c.slug;
    const r=await tab.goto(PUBLIC+url,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(r?.status(),200,'Category HTTP '+url);
    await tab.locator('[data-catalog-product]').first().waitFor({state:'visible',timeout:15000});
    const cards=await tab.locator('[data-catalog-product]').count();
    assert(cards>0,'No cards in category '+url);
    if(c.sourceCount<=8){
      const actualIds=await tab.locator('[data-catalog-product]').evaluateAll(nodes=>nodes.map(node=>String(node.getAttribute('data-catalog-product')||'')));
      const expectedIds=[...expectedIdsByCategory.get(c.slug)];
      assert.deepEqual(actualIds.sort(),expectedIds.sort(),'Product IDs shown in category differ from verified WordPress '+url);
    }else{
      assert(cards>=8,'Too few Product cards rendered for '+url+' expected at least 8 actual '+cards);
    }
    const overflow=await tab.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-window.innerWidth);
    assert(overflow<=3,'Horizontal overflow '+url+' '+width+' '+overflow);
    const filename='light-'+c.slug+'-'+width+'.png';
    await tab.screenshot({path:dir+'/'+filename,fullPage:false});
    report.screenshots.push(filename);
    report.checks.push({url,width,cards,http:r.status(),overflow});
    console.log('LIGHT_CATEGORY_UI_PASS='+JSON.stringify({slug:c.slug,width,cards}));
    save();
   }
   // Product detail route smoke: newly imported source IDs and one enriched
   // existing Kaokui. These are backed by native WP Product Rewrites.
   const representativeSlugs=[
     'chihiros-b-series-den-led-cho-be-thuy-sinh-chihiros-b90',
     'den-led-trang-xuanmeilong-xml-60-12w',
     'led-odyssea-slim-x-10000k',
     'den-kaokui-70w-pro-2',
   ];
   for(const slug of representativeSlugs){
     const sourceProduct=seen.get(slug);
     assert(sourceProduct,'Route QA source slug missing '+slug);
     const url='/san-pham/'+slug;
     const res=await tab.goto(PUBLIC+url,{waitUntil:'domcontentloaded',timeout:60000});
     assert.equal(res?.status(),200,'Product detail HTTP '+url);
     await tab.locator('h1').first().waitFor({state:'visible',timeout:15000});
     const h1=(await tab.locator('h1').first().innerText()).replace(/\s+/g,' ').trim();
     const name=await tab.evaluate(value=>{
       const doc=new DOMParser().parseFromString(value,'text/html');
       return String(doc.body.textContent||'').replace(/\s+/g,' ').trim();
     },String(sourceProduct.name||''));
     const normalized=value=>String(value).normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase('vi');
     assert.equal(normalized(h1),normalized(name),'Product H1 mismatch '+slug);
     const overflow=await tab.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
     assert(overflow<=3,'Detail horizontal overflow '+url+' '+width+' '+overflow);
     const filename='light-detail-'+slug+'-'+width+'.png';
     await tab.screenshot({path:dir+'/'+filename,fullPage:false});
     report.screenshots.push(filename);
     report.checks.push({url,width,h1,sourceId:sourceProduct.id,http:res.status(),overflow});
     console.log('LIGHT_PRODUCT_DETAIL_UI_PASS='+JSON.stringify({slug,width,sourceId:sourceProduct.id}));
     save();
   }
   assert.deepEqual(errors,[],'Product category browser JS errors width='+width);
   await context.close();
  }
  report.status='QA_PASS';report.finished=new Date().toISOString();save();
  console.log('LIGHT_PRODUCTION_QA_PASS='+JSON.stringify({sha:CONFIG.sha,sourceProducts:seen.size,categories:report.categories.length,viewports:[1440,390],screenshots:report.screenshots.length}));
 }finally{await browser.close()}
}
run().catch(e=>{report.status='QA_FAILED';report.error=String(e.stack||e).slice(0,2000);save();console.error('LIGHT_PRODUCTION_QA_FAIL='+report.error);process.exitCode=1});
