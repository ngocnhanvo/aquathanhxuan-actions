const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const wp='https://admin.aquathanhxuan.io.vn';
const out='artifacts/home00-mobile-preflight';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WordPress credentials missing');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage();
 await page.goto(wp+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
 if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
 }
 await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
 await page.goto(wp+'/wp-admin/admin.php?page=tablepress&action=edit&table_id=home_00',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:25000});
 const grid=await page.evaluate(()=>window.tp.editor.getData());
 assert(Array.isArray(grid)&&grid.length>=4,'Invalid home_00 table format');
 const heading=grid[0].map(x=>String(x||''));
 const mobileCol=heading.indexOf('mobile'),imageCol=heading.indexOf('image');
 assert(imageCol>=0&&mobileCol>=0,'image or mobile column missing');
 const summaries=grid.slice(2).map((row,i)=>({
   index:i+2, columns:row.length,
   mobile:String(row[mobileCol]||''),
   image:String(row[imageCol]||'').slice(0,220),
   otherNonEmpty:heading.filter((k,j)=>j!==imageCol&&String(row[j]||'').trim()).map(k=>k)
 }));
 const metadata={id:'home_00',rows:grid.length,columns:heading,mobileCol,imageCol,summaries};
 fs.writeFileSync(out+'/table.json',JSON.stringify(metadata,null,2)+'\n');
 const media=await page.request.get(wp+'/wp-json/wp/v2/media?search=aqua-thanh-xuan-mobile-hero&per_page=20',{timeout:20000});
 const mediaPayload=media.ok()?await media.json():[];
 console.log('HOME00_MOBILE_PREFLIGHT='+JSON.stringify({...metadata,existingMedia:Array.isArray(mediaPayload)?mediaPayload.map(m=>({id:m.id,slug:m.slug,source_url:m.source_url})):[]}));
 const resp=await page.request.get(wp+'/wp-json/tablepress/v1/tables/home_00',{timeout:20000});
 console.log('HOME00_REST_STATUS='+resp.status());
 }finally{await browser.close();}
})().catch(e=>{console.error('HOME00_MOBILE_PREFLIGHT_FAIL='+String(e.stack||e));process.exitCode=1});
