'use strict';
/** Independently audited legacy menu -> exact WordPress menu targets.
 * Caller supplies the immutable READ-ONLY source/target audit report.
 * Never invent a taxonomy term or redirect to a non-existent category.
 */
const assert=require('node:assert/strict');
function nameKey(s){
 return String(s||'').normalize('NFD').toLowerCase()
  .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d')
  .replace(/[^a-z0-9]+/g,' ').trim();
}
function decode(s){
 return String(s||'')
  .replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)))
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;|&#039;/gi,"'")
  .replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
}
// Additional independent old-domain pages verified by live web retrieval
// on 2026-11-11 (9 source fetches timed out in the batch audit).
const verifiedWebTitles={
 '/danh-muc/may-loc/may-loc-fksc':'FKSC – AQua Thanh Xuân',
 '/danh-muc/thuong-hieu/neo':'NEO – AQua Thanh Xuân',
 '/danh-muc/nen-cho-be-thuy-sinh/phan-nen-chihiros':'Chihiros – AQua Thanh Xuân',
 '/danh-muc/nen-cho-be-thuy-sinh/vu-aqua':'Vũ Aqua – AQua Thanh Xuân',
 '/danh-muc/nen-cho-be-thuy-sinh/phan-nen-dennerle':'Dennerle – AQua Thanh Xuân',
 '/danh-muc/co2/binh-co2':'Bình CO2 – AQua Thanh Xuân',
 '/danh-muc/co2/van-co2':'Van CO2 – AQua Thanh Xuân',
 '/danh-muc/co2/khac':'Phụ kiện CO2 – AQua Thanh Xuân',
 '/danh-muc/cay-va-ca-thuy-sinh':'Cây và cá thủy sinh – AQua Thanh Xuân',
};

function buildSeoManifest(report){
 assert(Array.isArray(report.entries)&&report.entries.length===88,'Expected 88 audited legacy categories');
 assert(Array.isArray(report.wp_categories)&&report.wp_categories.length>=80,'Missing independent Woo category inventory');
 assert(Array.isArray(report.wp_header_all)&&report.wp_header_all.length>=95,'Missing WordPress Header menu inventory');
 const termsBySlug=new Map(report.wp_categories.map(x=>[x.slug,x]));
 const menus=[];
 for(const node of report.wp_header_all){
  if(node.depth===0) menus.push({root:node,children:[]});
  else if(nameKey(node.label)!=='tat ca') menus.at(-1).children.push(node);
 }
 assert(menus.length===11,'Expected 11 menu roots, got '+menus.length);
 const roots=[];
 for(const entry of report.entries.slice(0,86)){
  if(entry.old_path.split('/').length===3 && (roots.length===0||entry.label===entry.label.toUpperCase()))roots.push({root:entry,children:[]});
  else roots.at(-1).children.push(entry);
 }
 assert(roots.length===menus.length,'Menu root count mismatch');
 const result=[];
 const collect=(entry,node,parent,sourceGroup)=>{
  const oldPath=entry.old_path;
  const newPath='/'+String(node.href||'').replace(/^\/+|\/+$/g,'');
  assert(/^\/san-pham\/[a-z0-9-]+$/.test(newPath),'Invalid target '+newPath);
  assert(/^\/danh-muc\/[a-z0-9-/]+$/.test(oldPath),'Invalid source '+oldPath);
  const slug=newPath.split('/').at(-1);
  const term=termsBySlug.get(slug);
  assert(term&&term.id>0,'Unknown WooCommerce term for '+newPath);
  const sourceTitle=decode(entry.old?.title) || verifiedWebTitles[oldPath] || '';
  const verified=(entry.old?.status===200 && sourceTitle.length>0) || Boolean(verifiedWebTitles[oldPath]);
  const title=verified?sourceTitle:
    (sourceGroup?entry.label:entry.label.toUpperCase())+' – AQua Thanh Xuân';
  const groupLabel=parent||term.name;
  const description=parent
   ? 'Khám phá '+term.name+' thuộc danh mục '+groupLabel+' tại Aqua Thanh Xuân. Tham khảo sản phẩm, thông tin và giá bán để lựa chọn phù hợp cho bể thủy sinh.'
   : 'Khám phá danh mục '+term.name+' tại Aqua Thanh Xuân. Xem sản phẩm, phụ kiện, thông tin và giá bán để lựa chọn thiết bị phù hợp cho hồ cá và bể thủy sinh.';
  assert(title.length>=8&&description.length>75&&description.length<260,'Invalid SEO copy: '+newPath);
  result.push({old_path:oldPath,new_path:newPath,term_id:term.id,term_slug:slug,term_name:term.name,group:groupLabel,source_title_verified:verified,title,description,old_http_status:entry.old?.status||0});
 };
 for(let i=0;i<roots.length;i++){
  const original=roots[i],menu=menus[i];
  assert(original.children.length===menu.children.length,'Group menu length mismatch '+original.root.label);
  collect(original.root,menu.root,null,false);
  for(const old of original.children){
   const matches=menu.children.filter(node=>nameKey(node.label)===nameKey(old.label));
   assert(matches.length===1,'Non-unique menu mapping '+old.label+' in '+original.root.label);
   collect(old,matches[0],menu.root.label,true);
  }
 }
 for(const old of report.entries.slice(86)){
  const slug=old.old_path.split('/').at(-1);
  const term=termsBySlug.get(slug);
  assert(term,'Missing additional original taxonomy '+slug);
  const parent=old.old_path.includes('/nen-cho-be-thuy-sinh/')?'Nền':'Máy lọc';
  collect(old,{href:'san-pham/'+slug},parent,true);
 }
 const unique=(list,key)=>new Set(list.map(v=>v[key])).size===list.length;
 assert(result.length===88&&unique(result,'old_path')&&unique(result,'new_path'),'Non-unique or incomplete redirect map');
 return result;
}
module.exports={buildSeoManifest};
