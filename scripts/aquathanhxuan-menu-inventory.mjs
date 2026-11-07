const base = 'https://admin.aquathanhxuan.io.vn';
const endpoints = {
 categories: '/wp-json/astro/v1/get-product-categories',
 menus: '/wp-json/esc-api/v1/menus',
 pages: '/wp-json/wp/v2/pages?status=publish&per_page=100&_fields=id,slug,acf,title,link'
};
for (const [key,path] of Object.entries(endpoints)) {
  const response = await fetch(base+path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});
  const payload = await response.json();
  if(!response.ok)throw Error(key+' HTTP '+response.status);
  const result=key==='pages' ? (Array.isArray(payload)?payload.map(({id,slug,acf,title,link})=>({id,slug,action:acf?.action,key:acf?.key,product_lang:acf?.product_lang,title:title?.rendered,link})):payload) :
  key==='menus' ? {success:payload.success, Header:payload?.menus?.Header} : payload;
  console.log('AQUA_INVENTORY_'+key.toUpperCase()+'='+JSON.stringify(result));
}
