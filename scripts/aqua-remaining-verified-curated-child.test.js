'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { verifyChildCards }=require('./aqua-remaining-verified-curated-child.js');

const srcId=269165, targetId=82581, slug='loc-treo-sunsun-ybg-300-co-loc-vang-va-chinh-dong';
const source={id:srcId,slug,name:'Lọc treo Sunsun YBG 300',categories:[{id:1809},{id:1729}]};
const target={id:targetId,slug,name:source.name,categories:[{id:1788},{id:1769},{id:1821}],
  meta_data:[{key:'_esc_origin_product_id',value:String(srcId)}]};
const run=({product=target,original=source,expected=[],sourceRootId=1809,categoryId=1788,id=targetId}={})=>
  verifyChildCards({targetCategoryId:categoryId,sourceRootId,expectedIds:expected,
   renderedIds:[id],targetById:new Map([[id,product]]),sourceById:new Map([[srcId,original]])});

test('direct source child membership remains allowed',()=>{
 const result=run({expected:[targetId]});
 assert.deepEqual(result,{curated:[],invalid:[]});
});
test('only independently verified preexisting Sunsun Lọc treo reference is accepted',()=>{
 const result=run();
 assert.deepEqual(result,{curated:[{targetId,sourceId:srcId}],invalid:[]});
});
test('unverified extra target IDs remain rejected even when source ID is known',()=>{
 assert.equal(run({id:99001,product:{...target,id:99001}}).invalid.length,1);
});
test('wrong source root, category assignment or source identity remain rejected',()=>{
 assert.equal(run({sourceRootId:1771}).invalid.length,1);
 assert.equal(run({product:{...target,categories:[{id:1769}]}}).invalid.length,1);
 assert.equal(run({product:{...target,slug:'an-unrelated-product'}}).invalid.length,1);
});
test('no name-based blanket exception for any other Woo category',()=>{
 assert.equal(run({categoryId:1810}).invalid.length,1);
 assert.equal(run({original:{...source,name:'Unrelated item'}}).invalid.length,1);
});
