'use strict';
/** Read-only full transport probe for live WordPress paged Product events. */
const assert=require('node:assert/strict');
const ROOT='https://admin.aquathanhxuan.io.vn/wp-json/astro/v1/get-product-logs';
const perPage=20;
const started=Date.now();
const seen=new Set();
const data=[];
async function load(page,snapshot) {
  const url=new URL(ROOT);
  url.searchParams.set('paged','1');
  url.searchParams.set('page',String(page));
  url.searchParams.set('per_page',String(perPage));
  if(snapshot) url.searchParams.set('snapshot',snapshot);
  const clock=Date.now();
  const response=await fetch(url,{signal:AbortSignal.timeout(29000)});
  if(!response.ok)throw Error('PRODUCT_LOG_PAGE_HTTP='+JSON.stringify({page,status:response.status}));
  const rows=await response.json();
  if(!Array.isArray(rows))throw Error('Product log page not array '+page);
  const elapsed=Date.now()-clock;
  console.log('AQUA_PRODUCT_LOG_PAGE='+JSON.stringify({page,rows:rows.length,elapsedMs:elapsed}));
  return {rows,headers:response.headers};
}
(async()=>{
  const first=await load(1);
  const snapshot=first.headers.get('X-ESC-Product-Log-Snapshot')||'';
  const total=Number(first.headers.get('X-WP-Total'));
  const pages=Number(first.headers.get('X-WP-TotalPages'));
  assert.match(snapshot,/^[a-f0-9]{64}$/,'Missing live PHP pagination snapshot');
  assert(Number.isSafeInteger(total)&&total>=0,'Missing total product log count');
  assert(Number.isInteger(pages)&&pages>=1&&pages<=1000,'Invalid total pages');
  assert.equal(pages,Math.max(1,Math.ceil(total/perPage)),'WordPress paged count mismatch');
  const collect=(result,page)=>{
    assert.equal(result.rows.length,Math.min(perPage,total-(page-1)*perPage),'Missing page entries');
    assert.equal(result.headers.get('X-ESC-Product-Log-Snapshot'),snapshot,'Snapshot changed mid-read');
    assert.equal(Number(result.headers.get('X-WP-Total')),total,'Total changed');
    assert.equal(Number(result.headers.get('X-WP-TotalPages')),pages,'Pages changed');
    for(const row of result.rows){
      assert(Number(row.id)>0,'Invalid Product log ID');
      assert(!seen.has(Number(row.id)),'Duplicate Product log ID '+row.id);
      seen.add(Number(row.id));
      assert(['modify','del'].includes(row.action),'Invalid Product log action');
      if(row.action==='modify')assert.equal(Number(row.product?.id),Number(row.id),'Missing Product payload');
      data.push(row);
    }
  };
  collect(first,1);
  for(let page=2;page<=pages;page++)collect(await load(page,snapshot),page);
  assert.equal(data.length,total,'Incomplete Product log collection');
  console.log('AQUA_LIVE_PRODUCT_LOG_PAGINATION_PASS='+JSON.stringify({total,pages,uniqueIds:seen.size,elapsedMs:Date.now()-started}));
})().catch(e=>{console.error('AQUA_LIVE_PRODUCT_LOG_PAGINATION_FAIL='+String(e.stack||e));process.exitCode=1});
