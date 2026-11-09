// Read-only inventory; never writes WordPress, posts, categories or menus.
const base='https://admin.aquathanhxuan.io.vn';
const get=async path=>{
  const r=await fetch(base+path,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('HTTP '+r.status+' '+path);
  return r.json();
};
const [menu,categories]=await Promise.all([
  get('/wp-json/esc-api/v1/menus?submenu_audit='+Date.now()),
  get('/wp-json/astro/v1/get-product-categories?submenu_audit='+Date.now())
]);
const root=menu?.menus?.Header?.vi;
if(!root||!Array.isArray(root.items))throw Error('Canonical Header.vi not found');
if(!Array.isArray(categories))throw Error('Product categories payload is not array');
const flatten=(items,depth=0)=>items.flatMap(i=>[{id:i.id||null,label:i.label,slug:i.slug,href:i.href,linkMode:i.linkMode,depth,children:(i.children||[]).length},...flatten(i.children||[],depth+1)]);
const items=flatten(root.items);
console.log('MENU_SOURCE='+JSON.stringify({id:root.id||null,name:root.name||null,code:root.code||null,type:root.type||null,roots:root.items.length,total:items.length,tree:items.slice(0,130)}));
console.log('CATEGORY_SOURCE='+JSON.stringify({total:categories.length,records:categories.map(c=>({id:c.id,slug:c.slug,name:c.name,parent:c.parent,lang:c.product_lang||c.lang||null})).slice(0,500)}));
console.log('AQUA_SUBMENU_INVENTORY_PASS=1');
