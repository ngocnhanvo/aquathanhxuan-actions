const wp='https://admin.aquathanhxuan.io.vn',front='https://aquathanhxuan.io.vn';
async function examine(url){
 try{
 const r=await fetch(url,{redirect:'manual',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
 const body=String(r.headers.get('content-type')||'').includes('text/html')?(await r.text()).slice(0,5500):'';
 return {url,status:r.status,location:r.headers.get('location'),body:body.slice(0,5500)};
 }catch(e){return {url,error:String(e).slice(0,180)}}
}
const tests=[
'/san-pham/may-sui-khi-atman-hp-12000',
'/san-pham/may-sui-khi-atman-hp-12000/',
'/san-pham/atman',
'/san-pham/atman-at-304s',
'/ssr/products/atman-at-304s/detail',
'/ssr/products/may-sui-khi-atman-hp-12000/detail',
'/ssr/products/may-sui-khi-atman-hp-12000/detail?basename=%2F&curUrl=%2Fsan-pham%2Fmay-sui-khi-atman-hp-12000',
'/san-pham/atman?sort=price-asc',
'/ssr/products/san-pham/1?catSlug=atman',
'/ssr/products/san-pham/atman?catSlug=atman',
'/ssr/products/san-pham/1?basename=%2F&catSlug=atman&curUrl=%2Fsan-pham%2Fatman'
];
for(const path of tests)console.log('ATMAN_ROUTE_HTTP='+JSON.stringify(await examine(front+path)));
const root=wp+'/wp-json/wp/v2/chuyen-huong-link?status=publish&per_page=100&page=';
let records=[];
for(let page=1;page<=10;page++){
 const r=await fetch(root+page,{signal:AbortSignal.timeout(20000)});
 if(r.status===400)break;
 if(!r.ok)throw Error('Redirect inventory status '+r.status);
 const items=await r.json();
 if(!Array.isArray(items))throw Error('Redirect API invalid');
 records.push(...items.map(x=>({id:x.id,title:x.title?.rendered,acf:x.acf||{},modified:x.modified,priority:x.route_priority,conditions:x.route_conditions})));
 if(items.length<100)break;
}
console.log('ATMAN_REDIRECT_INVENTORY='+JSON.stringify({total:records.length,rules:records.filter(x=>JSON.stringify(x).includes('san-pham')||JSON.stringify(x).includes('ssr/products')).slice(0,60)}).slice(0,22000));
