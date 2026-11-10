'use strict';
// READ ONLY: inspect live native ESC Tables and Builder states. No saving, orders,
// passwords, email requests, customer sessions, coupons, gateways or CMS writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const WP='https://admin.aquathanhxuan.io.vn';
const FRONT='https://aquathanhxuan.io.vn';
const OUT='artifacts/aqua-business-pages-builder';
const pages=[
 {id:83821,table:'order_history_vi',count:38,slug:'lich-su-mua-hang',states:['orders','empty','guest','loading','error']},
 {id:83808,table:'cart_ui_vi',count:20,slug:'cart',states:['items','empty']},
 {id:83810,table:'checkout_ui_vi',count:59,slug:'checkout',states:['guest','account']},
 {id:83812,table:'checkout_done_ui_vi',count:34,slug:'order-received',states:['success','error']},
 {id:83827,table:'lost_password_vi',count:12,slug:'quen-mat-khau',states:['form','success','error']},
 {id:83829,table:'reset_password_vi',count:20,slug:'dat-lai-mat-khau',states:['form','invalid','success']},
 {id:82718,table:'support_contact',slug:'lien-he',states:[]},
 {id:82716,table:'support_complaint',slug:'khieu-nai',states:[]},
 {id:82714,table:'support_dealer',slug:'dai-ly',states:[]}
];
fs.mkdirSync(OUT,{recursive:true});
const audit={result:'STARTED',pages:[],blockedWrites:[]};
const record=()=>fs.writeFileSync(OUT+'/result.json',JSON.stringify(audit,null,2)+'\n');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
   const page=await browser.newPage({viewport:{width:1440,height:900}});
   const unsafe=[];
   page.on('request',r=>{
     const method=r.method(),path=new URL(r.url()).pathname;
     if(method!=='GET' && /\/api\/(?:cart\/(?:checkout|add|del|update)|user\/(?:lostpass|resetpass|login)|agent\/chat)/.test(path)) {
       unsafe.push({method,path});
       // An accidental mutation must be caught in the report; this runner never
       // sends user credentials/order input into the protected forms.
     }
   });
   await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
   if(await page.locator('#user_login').count()){
     assert(process.env.WP_ADMIN_USERNAME && process.env.WP_ADMIN_PASSWORD,'WP secrets missing');
     await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
     await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
     await page.locator('#wp-submit').click();
   }
   await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:50000});
   const nonceResponse=await page.request.get(WP+'/wp-admin/admin-ajax.php?action=rest-nonce');
   assert.equal(nonceResponse.status(),200,'No WP REST nonce');
   const headers={'X-WP-Nonce':(await nonceResponse.text()).trim()};
   // The production WordPress API sometimes resets keep-alive sockets while
   // rebuilding. Read-only GETs may be retried; never replay mutations.
   const wpGet=async(url)=>{
     for(let attempt=0;attempt<4;attempt++){
       try{
         const response=await page.request.get(url,{headers,timeout:40000,failOnStatusCode:false});
         if([429,502,503,504].includes(response.status()) && attempt<3){
           console.log('AQUA_QA_WP_READ_RETRY status='+response.status()+' attempt='+(attempt+1));
           await page.waitForTimeout(1000*(attempt+1));
           continue;
         }
         return response;
       }catch(error){
         if(!/ECONNRESET|socket hang up|ETIMEDOUT|Timeout|ECONNREFUSED/i.test(String(error)) || attempt===3)throw error;
         console.log('AQUA_QA_WP_READ_RETRY transient attempt='+(attempt+1));
         await page.waitForTimeout(1000*(attempt+1));
       }
     }
     throw new Error('WordPress read retry budget exceeded');
   };
   const markerResponse=await page.request.get(FRONT+'/aquathanhxuan-staging-build.json?business_qa='+Date.now());
   assert.equal(markerResponse.status(),200,'Production marker unavailable');
   const marker=await markerResponse.json();
   const qaRequest=JSON.parse(fs.readFileSync('qa-requests/aqua-business-pages-builder-production.json','utf8'));
   assert.match(String(qaRequest.source_sha||''),/^[a-f0-9]{40}$/,'Unpinned QA source');
   assert.equal(marker.commit,qaRequest.source_sha,'Wrong production Astro source');
   for(const p of pages){
     const wpRes=await wpGet(WP+'/wp-json/wp/v2/pages/'+p.id+'?context=edit&_qa='+Date.now());
     assert.equal(wpRes.status(),200,'Missing WordPress Page '+p.slug);
     const wpPage=await wpRes.json();
     assert.equal(wpPage.slug,p.slug,'Page slug changed: '+p.slug);
     assert.equal(wpPage.status,'publish','Unpublished Page: '+p.slug);
     const tableRes=await wpGet(WP+'/wp-json/tablepress/v1/table/'+p.table+'?_qa='+Date.now());
     assert.equal(tableRes.status(),200,'Native ESC Table unavailable '+p.table);
     const table=await tableRes.json();
     if(p.count){
       assert.equal(table.items?.length,p.count,'Label row count mismatch '+p.table);
       assert(table.items.every(item=>String(item.key||'').trim()&&String(item.label||'').trim()),
         'Uneditable/blank UI labels: '+p.table);
     }else{
       assert(Array.isArray(table.items)&&table.items.length>=6,'Support Table has no content '+p.table);
       const shell=table.items.filter(item=>String(item?.kind||'').toLowerCase()==='shell');
       assert.equal(shell.length,13,'Missing native support chrome label rows '+p.table);
       assert.equal(new Set(shell.map(item=>item.title)).size,13,'Duplicate support chrome keys '+p.table);
       assert(shell.every(item=>String(item.description||'').trim()),'Empty support chrome labels '+p.table);
     }
     const raw=String(wpPage.content?.raw||'');
     assert(raw.includes('[table id='+p.table+' /]'),'Page missing native Insert Code '+p.slug);
     await page.goto(WP+'/wp-admin/edit.php?post_type=page&page=esc-visual-builder&esc_vb_page='+p.id,
       {waitUntil:'domcontentloaded',timeout:65000});
     const frame=page.frameLocator('#esc-vb-frame');
     if(p.states.length){
       await frame.locator('#esc-business-preview-state').waitFor({state:'visible',timeout:70000});
       const states=await frame.locator('#esc-business-preview-state option')
          .evaluateAll(nodes=>nodes.map(x=>x.value));
       assert.deepEqual(states,p.states,'Incorrect Builder states '+p.slug);
       for(const state of p.states){
         if(await frame.locator('#esc-business-preview-state').inputValue()!==state){
           await frame.locator('#esc-business-preview-state').selectOption(state);
         }
         // Navigation may finish after selectOption resolves. Poll the URL of
         // the iframe, not merely the old select element left during unload.
         let vb=null;
         for(let attempt=0;attempt<12;attempt++){
           await page.waitForTimeout(500);
           vb=await frame.locator('#esc-business-preview-state')
             .evaluate(()=>new URLSearchParams(location.search).get('vb_state')).catch(()=>null);
           if(vb===state)break;
           if(state===p.states[0] && vb===null)break;
         }
         if(state!==p.states[0] && vb!==state){
           // Explicit preview button is safe despite the global form-submit
           // firewall; it navigates only within the authorized iframe.
           console.log('AQUA_BUSINESS_STATE_BUTTON_FALLBACK='+p.slug+':'+state);
           await frame.locator('#esc-business-preview-state').selectOption(state);
           await frame.locator('#esc-business-preview-apply').click();
           for(let attempt=0;attempt<12;attempt++){
             await page.waitForTimeout(500);
             vb=await frame.locator('#esc-business-preview-state')
               .evaluate(()=>new URLSearchParams(location.search).get('vb_state')).catch(()=>null);
             if(vb===state)break;
           }
         }
         if(state!==p.states[0])assert.equal(vb,state,'Preview state navigation failed '+p.slug+':'+state);
         await frame.locator('#esc-business-preview-state').waitFor({state:'visible',timeout:70000});
         assert.equal(await frame.locator('#esc-business-preview-state').inputValue(),state,
           'Preview select mismatch '+p.slug+':'+state);
         const cell=frame.locator('[data-esc-source-table="'+p.table+'"][data-esc-source-field="label"]:visible').first();
         await cell.waitFor({state:'visible',timeout:25000});
         const source=await cell.evaluate(el=>({
           table:el.getAttribute('data-esc-source-table'),
           version:el.getAttribute('data-esc-rendered-version'),
           row:el.getAttribute('data-esc-source-row'),
           field:el.getAttribute('data-esc-source-field')
         }));
         assert.equal(source.table,p.table);
         assert.match(source.version||'',/^[a-f0-9]{64}$/,'No live Table version '+p.table);
         assert.match(source.row||'',/^\d+$/);
         assert.equal(source.field,'label');
         console.log('AQUA_BUSINESS_STATE_PASS='+p.slug+':'+state);
       }
     }else{
       await frame.locator('[data-esc-source-table="'+p.table+'"][data-esc-source-row]:visible')
         .first().waitFor({state:'visible',timeout:65000});
       assert.equal(await frame.locator('#esc-business-preview-state').count(),0,
         'Ordinary Support Page must use production-like Preview');
       // A support Page can have multiple content sections, each with its
       // own eyebrow. Confirm at least one exact editable source, not a
       // single matching DOM node for the entire Page.
       const eyebrows=frame.locator('.support-section__eyebrow[data-esc-source-table="'+p.table+'"]');
       assert((await eyebrows.count())>=1,'Support eyebrow source missing '+p.table);
       const eyebrow=eyebrows.first();
       await eyebrow.waitFor({state:'visible',timeout:20000});
       assert.equal(await eyebrow.getAttribute('data-esc-source-field'),'description');
       const chromeTitle=frame.locator('aside h2[data-esc-source-table="'+p.table+'"]');
       assert.equal(await chromeTitle.count(),1,'Support sidebar title not ESC-managed '+p.table);
     }
     // Prefer a visible, non-navigating text cell. Clicking the first cell
     // of Checkout lands on the breadcrumb <li><a>, which the Builder rightly
     // intercepts as navigation rather than text editing.
     const headline=frame.locator('h1[data-esc-source-table="'+p.table+'"][data-esc-source-row]:visible, h2[data-esc-source-table="'+p.table+'"][data-esc-source-row]:visible, .support-section__eyebrow[data-esc-source-table="'+p.table+'"]:visible').first();
     const target=(await headline.count()) ? headline :
       frame.locator('[data-esc-source-table="'+p.table+'"][data-esc-source-row]:visible:not(a):not(li):not(button):not(input)').first();
     await target.waitFor({state:'visible',timeout:25000});
     const coords=await target.evaluate(el=>({
       tag:el.tagName.toLowerCase(),row:el.getAttribute('data-esc-source-row'),
       field:el.getAttribute('data-esc-source-field'),version:el.getAttribute('data-esc-rendered-version'),
     }));
     assert.match(coords.row||'',/^\d+$/,'Missing physical row '+p.slug);
     assert.match(coords.version||'',/^[a-f0-9]{64}$/,'Missing version '+p.slug);
     assert(coords.field,'Missing exact field '+p.slug);
     await target.click();
     // Verify the actual cell selection, not merely that any default option
     // is selected in the WordPress editor.
     await page.waitForFunction(expected=>{
       const selected=document.querySelector('#esc-vb-edit-row option:checked');
       return selected?.value===expected;
     },coords.row+':'+coords.field,{timeout:22000});
     if(p.count){
       // Every native key/label row must be independently editable, including
       // checkout labels beyond row 40. Stable lookup keys must never be edited.
       const labelRows=page.locator('#esc-vb-edit-row option[value$=":label"]');
       assert.equal(await labelRows.count(),p.count,
         'Incomplete native label editor rows '+p.table);
       assert.equal(await page.locator('#esc-vb-edit-row option[value$=":key"]').count(),0,
         'Stable UI label identity is editable '+p.table);
     }
     audit.pages.push({slug:p.slug,page_id:p.id,table:p.table,states:p.states.length,
       coordinate:true,selectedField:coords.field,labelCount:p.count||null});
     record();
     console.log('AQUA_BUILDER_PAGE_PASS='+p.slug);
   }
   assert.deepEqual(unsafe,[],'Visual Builder attempted mutations: '+JSON.stringify(unsafe));
   audit.blockedWrites=unsafe;
   audit.result='PASS';
   record();
   console.log('AQUA_BUILDER_NINE_PAGES_QA_PASS pages=9 readonly=true');
 }finally{await browser.close();}
})().catch(e=>{
  audit.result='FAIL';
  // Playwright API failures append a request call-log with authenticated
  // Cookie/X-WP-Nonce headers. Do not persist those headers into artifacts,
  // workflow stdout or the public repository Actions history.
  audit.error=String(e?.message||e).split('\n')[0].slice(0,350);
  record();
  console.error('AQUA_BUILDER_NINE_PAGES_QA_FAIL '+audit.error);
  process.exitCode=1;
});