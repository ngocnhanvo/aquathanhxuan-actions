const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const ORIGIN='https://admin.aquathanhxuan.io.vn';
const PARENT={id:1775,name:'Nền',slug:'nen-cho-be-thuy-sinh'};
const TERMS=[
 {name:'Chihiros',slug:'chihiros'},
 {name:'Contro Soil',slug:'contro-soil'},
 {name:'Master Soil',slug:'master-soil'},
 {name:'Tropica',slug:'tropica'},
 {name:'Vũ Aqua',slug:'vu-aqua'},
 {name:'Dennerle',slug:'dennerle'},
 {name:'Gex',slug:'gex'}
];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const audit={created:[],unchanged:[],failed:[]};
 try{
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  await page.goto(ORIGIN+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
  if(await page.locator('#user_login').count()){
    await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME||'');
    await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD||'');
    await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:30000});
  const readTerms=async()=>{
    const r=await page.evaluate(async()=>{
      const response=await fetch('/wp-json/wp/v2/product_cat?hide_empty=false&per_page=100',
        {credentials:'same-origin',cache:'no-store'});
      return {status:response.status,data:await response.json()};
    });
    assert.equal(r.status,200,'Cannot read WordPress categories');
    assert(Array.isArray(r.data),'Invalid category response');
    return r.data;
  };
  const before=await readTerms();
  assert(before.some(x=>x.id===PARENT.id&&x.parent===0&&x.name===PARENT.name&&x.slug===PARENT.slug),
    'Nền parent taxonomy changed; fail closed');
  const unrelated=before.filter(x=>x.parent!==PARENT.id&&TERMS.some(t=>t.slug===x.slug));
  assert.equal(unrelated.length,0,'Same slug already belongs to another taxonomy branch');
  for(const term of TERMS){
    const existing=(await readTerms()).find(x=>x.slug===term.slug);
    if(existing){
      assert.equal(existing.parent,PARENT.id,
        'Category already exists under wrong parent: '+term.slug);
      audit.unchanged.push({id:existing.id,slug:term.slug});
      continue;
    }
    await page.goto(ORIGIN+'/wp-admin/edit-tags.php?taxonomy=product_cat&post_type=product',
      {waitUntil:'domcontentloaded',timeout:60000});
    assert(await page.locator('#tag-name').count(),'Cannot find category creation form');
    await page.locator('#tag-name').fill(term.name);
    await page.locator('#tag-slug').fill(term.slug);
    await page.locator('#parent').selectOption(String(PARENT.id));
    await page.locator('#submit').click();
    let created;
    for(let attempt=0;attempt<35;attempt++){
      const current=await readTerms();
      created=current.find(x=>x.slug===term.slug);
      if(created)break;
      await page.waitForTimeout(400);
    }
    assert(created,'New term not found after save: '+term.slug);
    assert.equal(created.parent,PARENT.id,'Wrong parent for '+term.slug);
    assert.equal(created.name,term.name,'Wrong name for '+term.slug);
    audit.created.push({id:created.id,slug:term.slug,parent:created.parent});
  }
  const after=await readTerms();
  assert(TERMS.every(t=>after.some(x=>x.slug===t.slug&&x.parent===PARENT.id)),
    'Final WordPress taxonomy check failed');
  console.log('SUBSTRATE_BRANDS_SUCCESS='+JSON.stringify({
    parent:PARENT,created:audit.created,unchanged:audit.unchanged,
    childTerms:after.filter(x=>x.parent===PARENT.id).map(x=>({id:x.id,name:x.name,slug:x.slug,count:x.count}))
  }));
 }catch(error){
   audit.failed.push(String(error));
   console.error('SUBSTRATE_BRANDS_FAIL='+JSON.stringify(audit));
   throw error;
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
