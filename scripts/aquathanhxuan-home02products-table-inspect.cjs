const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});
 const p=await b.newPage();
 const WP='https://admin.aquathanhxuan.io.vn';
 const result={};
 try{
  await p.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded'});
  if(await p.locator('#user_login').count()){
   await p.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await p.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await p.locator('#wp-submit').click();
  }
  await p.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:40000});
  for(const id of ['home_01','home_02products','144']){
   const r=await p.request.get(WP+'/wp-json/tablepress/v1/table/'+id+'?qa='+Date.now());
   const json=r.status()===200?await r.json():{};
   result[id]={http:r.status(),api:json.meta?.api,meta:json.meta,
     itemCount:json.items?.length,firstItem:json.items?.[0]};
   await p.goto(WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+id,
    {waitUntil:'domcontentloaded'});
   result[id].native=await p.evaluate(()=>({
     title:document.title,
     apiElements:[...document.querySelectorAll('[id*="custom_api"],[name*="custom_api"],[id*="api-source"],[name*="api-source"]')]
       .map(n=>({id:n.id,name:n.getAttribute('name'),value:n.value,text:n.textContent?.slice(0,180)})).slice(0,12),
     formFields:[...document.querySelectorAll('input,select')].map(n=>({id:n.id,name:n.name,
       value:n.name?.includes('api')?n.value:undefined}))
       .filter(x=>/api/i.test(x.id||'')||/api/i.test(x.name||'')).slice(0,15),
     tpTable:window.tp?.table?{id:window.tp.table.id,meta:window.tp.table.meta,options:window.tp.table.options}:null,
   }));
  }
  console.log('HOME02_TABLE_INSPECT='+JSON.stringify(result).slice(0,12000));
  fs.mkdirSync('chatgpt',{recursive:true});
  fs.writeFileSync('chatgpt/home02products-table-inspect.json',JSON.stringify(result,null,2)+'\n');
 }finally{await b.close()}
})().catch(e=>{console.error('TABLE_INSPECT_FAIL='+String(e));process.exitCode=1});
