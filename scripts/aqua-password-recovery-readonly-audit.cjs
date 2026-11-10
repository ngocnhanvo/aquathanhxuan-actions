'use strict';
const assert = require('node:assert/strict');
const WP = 'https://admin.aquathanhxuan.io.vn';
const SITE = 'https://aquathanhxuan.io.vn';
const target = ['quen-mat-khau', 'dat-lai-mat-khau', 'lich-su-mua-hang'];
const exact = ['custom/v1/lost-password', 'custom/v1/reset-password'];
(async()=>{
  const pagesUrl = WP + '/wp-json/wp/v2/pages?status=publish&per_page=100&_fields=id,slug,title,acf,status';
  const r = await fetch(pagesUrl);
  assert(r.ok, 'WordPress published Page REST GET HTTP '+r.status);
  const pages = await r.json();
  const selected = pages.filter(p=>
    target.includes(p.slug) || /lostpass|resetpass|password|mat-khau/i.test(String(p.acf?.key||'')+' '+String(p.acf?.action||'')+' '+p.slug)
  );
  console.log('PASSWORD_PAGE_REGISTRY='+JSON.stringify(selected.map(x=>({
    id:x.id,slug:x.slug,key:x.acf?.key,action:x.acf?.action,
    content_present:!!x.content?.rendered,status:x.status
  }))));
  const wpRoutes = await fetch(WP+'/wp-json/');
  assert(wpRoutes.ok,'WordPress REST discovery HTTP '+wpRoutes.status);
  const routes = Object.keys((await wpRoutes.json()).routes||{});
  for(const [i,route] of exact.entries()){
    const found=routes.includes('/'+route);
    console.log('RECOVERY_BACKEND_ENDPOINT_'+(i===0?'REQUEST':'RESET')+'='+found);
    assert(found,'Required existing WordPress password recovery endpoint is missing');
  }
  for(const pathname of target){
    const response=await fetch(SITE+'/'+pathname,{redirect:'manual'});
    console.log('PASSWORD_FRONTEND_ROUTE '+pathname+'='+response.status+' location_path='+(
      response.headers.get('location')?.replace(/^https?:\/\/[^/]+/,'').split('?')[0]||''));
  }
  console.log('AQUA_PASSWORD_RECOVERY_READ_ONLY_AUDIT_COMPLETE');
})().catch(e=>{console.error('AQUA_PASSWORD_RECOVERY_READ_ONLY_AUDIT_FAIL='+String(e));process.exitCode=1;});
