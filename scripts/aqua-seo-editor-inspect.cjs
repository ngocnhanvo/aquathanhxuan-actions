'use strict';
/** Inspect native Woo category Yoast SEO edit fields and redirect CPT REST capabilities; read-only. */
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const OUT='artifacts/aqua-seo-editor-inspect';
fs.mkdirSync(OUT,{recursive:true});
const report={status:'STARTED',scope:'WP_CATEGORY_SEO_AND_REDIRECT_ADMIN_READ_ONLY',checks:[],failures:[]};
const save=()=>fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');
(async()=>{
 if(!process.env.WP_ADMIN_USERNAME||!process.env.WP_ADMIN_PASSWORD)throw Error('Missing WP Admin credentials');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
  const nonce=(await (await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce')).text()).trim();
  const headers={'X-WP-Nonce':nonce};
  const response=await page.request.get(WP+'/wp-json/astro/v1/get-product-categories',{headers});
  if(!response.ok())throw Error('product-categories API HTTP '+response.status());
  const categories=await response.json();
  report.categories_count=categories.length;
  report.category_example=categories.find(c=>c.slug==='thuong-hieu');
  if(!report.category_example)throw Error('Missing published thuong-hieu category');
  const tagId=report.category_example.id;
  const url=WP+'/wp-admin/term.php?taxonomy=product_cat&tag_ID='+tagId+'&post_type=product';
  const editor=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  report.admin_url=url;report.editor_status=editor?.status();
  report.editor={title:await page.title(),possibleFields:await page.locator('input,textarea,select').evaluateAll(els=>els.filter(el=>/seo|yoast|wpseo|title|desc|description|nonce|submit|update/i.test([el.name,el.id,el.className].join(' '))).map(el=>({tag:el.tagName,name:el.name,id:el.id,type:el.type||'',value:String(el.value||'').slice(0,160)})).slice(0,140))};
  const redirects=await page.request.get(WP+'/wp-json/wp/v2/chuyen-huong-link?per_page=20&status=publish',{headers});
  report.redirects={http:redirects.status()};
  if(redirects.ok()){
    const arr=await redirects.json();report.redirects.total=Number(redirects.headers()['x-wp-total']||arr.length);
    report.redirects.first=arr.slice(0,3).map(x=>({id:x.id,title:x.title?.rendered,acf:x.acf,priority:x.route_priority}));
  }
  const opts=await page.request.fetch(WP+'/wp-json/wp/v2/chuyen-huong-link',{method:'OPTIONS',headers});
  report.redirects.rest_options_http=opts.status();
  if(opts.ok()){const j=await opts.json();report.redirects.methods=j.endpoints?.map(y=>({methods:y.methods,args:Object.keys(y.args||{}).slice(0,30)}));report.redirects.schema_properties=Object.keys(j.schema?.properties||{});}
  const newEdit=await page.goto(WP+'/wp-admin/post-new.php?post_type=chuyen-huong-link',{waitUntil:'domcontentloaded',timeout:50000});
  report.redirects.new_form_http=newEdit?.status();
  report.redirects.new_form=await page.locator('input,select,textarea').evaluateAll(els=>els.filter(el=>/acf|from|to|match|type|enable|_wpnonce/.test([el.id,el.name].join(' '))).map(el=>({tag:el.tagName,id:el.id,name:el.name,type:el.type,value:String(el.value||'').slice(0,70)})).slice(0,75));
  report.status='PASS';
  save();console.log('AQUA_SEO_EDITOR_INSPECT='+JSON.stringify(report).slice(0,22000));
 }finally{await browser.close()}
})().catch(e=>{report.status='FAIL';report.failures.push(String(e.stack||e).slice(0,600));save();console.error('AQUA_SEO_EDITOR_INSPECT_FAIL='+String(e.message||e));process.exitCode=1});
