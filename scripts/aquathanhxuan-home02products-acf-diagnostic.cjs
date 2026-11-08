const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox']});
const p=await b.newPage();
const base='https://admin.aquathanhxuan.io.vn';
try {
 await p.goto(base+'/wp-login.php',{waitUntil:'domcontentloaded'});
 if(await p.locator('#user_login').count()){
  await p.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
  await p.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
  await p.locator('#wp-submit').click();
 }
 await p.waitForURL(x=>x.pathname.startsWith('/wp-admin/'),{timeout:45000});
 const url=base+'/wp-admin/post.php?post=82535&action=edit&esc_full_admin=1';
 await p.goto(url,{waitUntil:'domcontentloaded'});
 const html=await p.content();
 let nonce='';
 const m=html.match(/wpApiSettings\s*=\s*(\{.*?\})\s*;/s);
 if(m){try{nonce=JSON.parse(m[1]).nonce||''}catch{}}
 if(!nonce)nonce=html.match(/"nonce"\s*:\s*"([A-Za-z0-9]+)"/)?.[1]||'';
 const response=await p.request.get(base+'/wp-json/wp/v2/product/82535?context=edit',
  {headers:nonce?{'X-WP-Nonce':nonce}:{}});
 const wp=response.ok()?await response.json():{};
 const wcResponse=await p.request.get(base+'/wp-json/wc/v3/products/82535',
  {headers:nonce?{'X-WP-Nonce':nonce}:{}});
 const wc=wcResponse.ok()?await wcResponse.json():{};
 const fields=await p.locator('[name*="acf"], [id*="acf"]').evaluateAll(nodes=>
  nodes.slice(0,100).map(n=>({tag:n.tagName,name:n.getAttribute('name'),id:n.id,
   value:n.tagName==='INPUT'||n.tagName==='SELECT'?n.value:undefined})));
 const labels=await p.locator('label').allTextContents();
 const result={
  wp_http:response.status(), wc_http:wcResponse.status(),
  wp_acf:wp.acf||null,wp_meta:wp.meta||null,
  wc_lang_meta:(wc.meta_data||[]).filter(x=>String(x.key).includes('lang')),
  acf_fields:fields,
  locale_labels:labels.filter(x=>/ngôn ngữ|language|product_lang/i.test(x)).slice(0,40),
  product_id:82535,
 };
 fs.mkdirSync('chatgpt',{recursive:true});
 fs.writeFileSync('chatgpt/home02products-acf.json',JSON.stringify(result,null,2));
 console.log('PRODUCT_ACF_DIAGNOSTIC='+JSON.stringify(result).slice(0,8500));
}finally{await b.close()}
})().catch(e=>{console.error(String(e));process.exitCode=1});
