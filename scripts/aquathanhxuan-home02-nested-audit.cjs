// Read-only audit for the Home 02 Product table migration.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const BASE='https://admin.aquathanhxuan.io.vn';
const IDS=['home_02','home_02products','tool_home02products'];
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();page.setDefaultTimeout(20000);
    await page.goto(BASE+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:40000});
    if(await page.locator('#user_login').count()){
      assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing credentials');
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:40000});
    for(const id of IDS){
      const response=await page.request.get(BASE+'/wp-json/tablepress/v1/table/'+id+'?audit='+Date.now());
      if(response.status()===404){console.log('HOME02_AUDIT_TABLE='+id+' NOT_FOUND');continue;}
      assert.equal(response.status(),200,id+' REST HTTP');
      const table=await response.json();
      const data=table.items||[];
      console.log('HOME02_AUDIT_TABLE='+JSON.stringify({
        id,api:table.meta?.api||null,columns:Object.keys(data[0]||{}),
        refs:data.map(x=>String(x.key||x['api-key']||'')).filter(Boolean),
        items:data.length,child:data.map(x=>x['shortcode-products']).filter(Boolean),
        version:table.rendered_version||table.version||null
      }));
    }
    await page.goto(BASE+'/wp-admin/admin.php?page=tablepress&action=edit&table_id=home_02',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:25000});
    console.log('HOME02_AUDIT_PARENT_GRID='+JSON.stringify(await page.evaluate(()=>window.tp.editor.getData().map(row=>row.map((cell,i)=>i===2&&row[0]!=='image'?'[media]':cell)))));
    await page.goto(BASE+'/wp-admin/post.php?post=82454&action=edit&esc_full_admin=1',{waitUntil:'domcontentloaded',timeout:50000});
    const raw=await page.locator('#content').inputValue();
    const sh=raw.match(/\[table\s+id=([a-zA-Z0-9_-]+)\s*\/\]/g)||[];
    const target='[table id=home_02products /]';
    const idx=raw.indexOf(target);
    console.log('HOME02_AUDIT_PAGE='+JSON.stringify({
      length:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),
      shortcodes:sh,legacyCount:raw.split(target).length-1,
      nearby:idx>=0?raw.slice(Math.max(0,idx-310),Math.min(raw.length,idx+target.length+310)):null
    }));
    console.log('HOME02_NESTED_AUDIT_PASS');
  }finally{await browser.close();}
})().catch(e=>{console.error('HOME02_NESTED_AUDIT_FAIL='+e.stack);process.exitCode=1});
