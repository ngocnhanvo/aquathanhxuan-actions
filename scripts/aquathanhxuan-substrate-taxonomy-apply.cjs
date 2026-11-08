const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const ORIGIN='https://admin.aquathanhxuan.io.vn';
const PARENT={id:1775,slug:'nen-cho-be-thuy-sinh',name:'Nền'};
const specs=[
  {name:'Dennerle Scaper’s Soil',slug:'dennerle-scapers-soil',products:[82481,82483]},
  {name:'Shrimp King Active Soil',slug:'shrimp-king-active-soil',products:[82489,82491]},
];
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const changes={created:[],updated:[],unchanged:[],errors:[]};
 try{
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto(ORIGIN+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:30000});
  async function api(path) {
   return page.evaluate(async endpoint=>{
    const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});
    return {status:response.status,data:await response.json()};
   },path);
  }
  async function terms(){
   const result=await api('/wp-json/wp/v2/product_cat?per_page=100&hide_empty=false');
   assert.equal(result.status,200,'Authenticated WP product_cat REST must be readable');
   assert(Array.isArray(result.data),'Invalid product categories');
   return result.data;
  }
  const existing=await terms();
  assert(existing.some(c=>c.id===PARENT.id&&c.name===PARENT.name&&c.slug===PARENT.slug&&c.parent===0),
   'Parent Nền taxonomy differs from inventoried source, aborting all writes');
  const expectedIds=specs.flatMap(x=>x.products);
  const existingProducts=new Map();
  for(const id of expectedIds){
   const response=await api('/wp-json/wp/v2/product/'+id);
   assert.equal(response.status,200,'Cannot read expected published product '+id);
   assert.equal(response.data.status,'publish','Do not modify unpublished product '+id);
   const n=String(response.data.title?.rendered||'').toLowerCase();
   assert(n.includes(id===82481||id===82483?'dennerle':'shrimp king'),
    'Product family mismatch: '+id);
   existingProducts.set(id,response.data.product_cat);
   assert(Array.isArray(response.data.product_cat),'Missing taxonomy list: '+id);
  }
  console.log('SUBSTRATE_PREFLIGHT='+JSON.stringify({
   parent:PARENT,
   before:[...existingProducts].map(([id,cats])=>({id,categories:cats}))
  }));
  for(const spec of specs){
   let found=(await terms()).find(c=>c.slug===spec.slug);
   if(found){
    assert.equal(found.parent,PARENT.id,
     'Slug exists under a different parent; do not reparent automatically: '+spec.slug);
    changes.unchanged.push('existing-category:'+spec.slug);
   }else{
    await page.goto(ORIGIN+'/wp-admin/edit-tags.php?taxonomy=product_cat&post_type=product',
     {waitUntil:'domcontentloaded',timeout:60000});
    assert(await page.locator('#tag-name').count(),'WP taxonomy add form unavailable');
    await page.locator('#tag-name').fill(spec.name);
    await page.locator('#tag-slug').fill(spec.slug);
    await page.locator('#parent').selectOption(String(PARENT.id));
    await page.locator('#submit').click();
    for(let i=0;i<30;i++){
     await sleep(350);
     found=(await terms()).find(c=>c.slug===spec.slug);
     if(found)break;
    }
    assert(found,'WordPress did not create category '+spec.slug);
    assert.equal(found.parent,PARENT.id,'Created category has wrong parent');
    changes.created.push({id:found.id,slug:spec.slug,parent:found.parent});
   }
   spec.id=found.id;
  }
  for(const spec of specs)for(const id of spec.products) {
   const before=existingProducts.get(id)||[];
   const desired=[...new Set([...before.filter(x=>x!==16),PARENT.id,spec.id])].sort((a,b)=>a-b);
   if(JSON.stringify([...before].sort((a,b)=>a-b))===JSON.stringify(desired)) {
    changes.unchanged.push('product:'+id);continue;
   }
   await page.goto(ORIGIN+'/wp-admin/post.php?post='+id+'&action=edit',
    {waitUntil:'domcontentloaded',timeout:60000});
   const root=page.locator('#product_catdiv');
   await root.waitFor({state:'attached',timeout:15000});
   const check=async termId=>{
    const selector='#in-product_cat-'+termId;
    const checkbox=root.locator(selector).first();
    await checkbox.waitFor({state:'attached',timeout:12000});
    if(!await checkbox.isChecked())await checkbox.check({force:true});
   };
   await check(PARENT.id);
   await check(spec.id);
   const uncategorized=root.locator('#in-product_cat-16').first();
   if(await uncategorized.count()&&await uncategorized.isChecked())
    await uncategorized.uncheck({force:true});
   const publish=page.locator('#publish');
   await publish.waitFor({state:'visible',timeout:15000});
   await publish.click();
   let after;
   for(let attempt=0;attempt<25;attempt++){
    await sleep(400);
    const response=await api('/wp-json/wp/v2/product/'+id);
    if(response.status===200 && Array.isArray(response.data.product_cat)){
     after=[...response.data.product_cat].sort((a,b)=>a-b);
     if(JSON.stringify(after)===JSON.stringify(desired))break;
    }
   }
   assert.deepEqual(after,desired,'WordPress category read-after-write mismatch: '+id);
   changes.updated.push({id,before,after});
  }
  const afterTerms=await terms();
  for(const spec of specs){
   const term=afterTerms.find(c=>c.slug===spec.slug);
   assert(term&&term.parent===PARENT.id&&term.id===spec.id,'Final taxonomy parity '+spec.slug);
  }
  console.log('SUBSTRATE_TAXONOMY_SUCCESS='+JSON.stringify(changes));
 }catch(e){
  changes.errors.push(String(e));
  console.error('SUBSTRATE_TAXONOMY_FAILED='+JSON.stringify(changes));
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
