// Native, scoped authoring: retain the two original desktop images untouched.
// Upload one image to WordPress Media and add one mobile-only slide to home_00.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const origin = 'https://admin.aquathanhxuan.io.vn';
const file = path.resolve('assets/aqua-thanh-xuan-mobile-hero.webp');
const filename = 'aqua-thanh-xuan-mobile-hero.webp';
const expectedHash = 'd9bf3fe3855df0fa49381bf356c8b91ba1a56aed5a5eb3e02640866bad111d71';
const alt = 'Bể thủy sinh Aqua Thanh Xuân với cây xanh, cá cảnh và thiết bị cho bể cá';
const tableId = 'home_00';
const output = 'artifacts/home00-mobile-upload';
fs.mkdirSync(output, {recursive:true});
const journal={tableId,mediaId:null,mediaCreated:false,changed:false,status:'STARTED'};
const save = () => fs.writeFileSync(output+'/result.json',JSON.stringify(journal,null,2)+'\n');
const quote = v => String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const imagePath = url => { const u=new URL(url,origin);assert.equal(u.origin,origin,'Media origin mismatch');assert(u.pathname.startsWith('/wp-content/uploads/'),'Media path mismatch');return u.pathname;};
let browser;
(async()=>{
 const bytes=fs.readFileSync(file);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expectedHash,'Mobile asset hash mismatch');
 assert.equal(bytes.length,23414,'Mobile asset byte size mismatch');
 assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'WP admin secrets missing');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.goto(origin+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:60000});
 if(await page.locator('#user_login').count()){
  await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
  await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
  await page.locator('#wp-submit').click();
 }
 await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
 const nonceResponse=await page.request.get(origin+'/wp-admin/admin-ajax.php?action=rest-nonce',{timeout:20000});
 assert.equal(nonceResponse.status(),200,'REST nonce unavailable');
 const nonce=(await nonceResponse.text()).trim();assert(nonce);
 const headers={'X-WP-Nonce':nonce,Accept:'application/json','Cache-Control':'no-cache'};
 const rest=async (endpoint,data)=> {
  const res=await (data===undefined?page.request.get(origin+endpoint,{headers,timeout:30000}):page.request.post(origin+endpoint,{headers,data,timeout:30000}));
  const body=await res.text();
  if(!res.ok())throw Error('REST '+endpoint+' HTTP '+res.status()+' '+body.slice(0,200));
  return JSON.parse(body);
 };
 const editorUrl=origin+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+tableId;
 await page.goto(editorUrl,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:30000});
 const original=await page.evaluate(()=>window.tp.editor.getData());
 const fields=['image','eyebrow','title','description','primary_label','primary_link','secondary_label','secondary_link','trust_1','trust_2','trust_3','mobile','link','show_text'];
 assert(Array.isArray(original)&&original.length===4,'Expected exactly two original CMS slides');
 assert.deepEqual(original[0],fields,'Unexpected home00 schema');
 const imageCol=fields.indexOf('image'),mobileCol=fields.indexOf('mobile');
 const originals=['cropped-banner-8-1.png','cropped-banner-6.png'];
 originals.forEach((filename,i)=>{
  assert(String(original[i+2][imageCol]).includes('/'+filename),'Original desktop banner '+i+' changed');
  const m=String(original[i+2][mobileCol]||'');
  assert(['','0'].includes(m),'Desktop banner unexpectedly mobile-only');
 });
 const snapshot={grid:original,sourceIds:original.slice(2).map(row=>row[imageCol])};
 fs.writeFileSync(output+'/before.json',JSON.stringify(snapshot,null,2)+'\n');
 console.log('HOME00_MOBILE_WRITE_SCOPE_PREFLIGHT=PASS original_images=2 table=home_00');
 const existing=await rest('/wp-json/wp/v2/media?context=edit&search=aqua-thanh-xuan-mobile-hero&per_page=100');
 const matches=existing.filter(m=>(m.slug||'')==='aqua-thanh-xuan-mobile-hero');
 assert(matches.length<=1,'Ambiguous existing Media asset');
 let media=matches[0];
 if(!media){
  const response=await page.request.post(origin+'/wp-json/wp/v2/media',{headers:{
   ...headers,'Content-Disposition':'attachment; filename="'+filename+'"'
  },multipart:{file:{name:filename,mimeType:'image/webp',buffer:bytes}},timeout:60000});
  const resultText=await response.text();
  if(!response.ok())throw Error('Media upload HTTP '+response.status()+' '+resultText.slice(0,260));
  media=JSON.parse(resultText);
  assert(Number.isSafeInteger(media.id),'Media upload returned invalid ID');
  journal.mediaCreated=true;
 }
 journal.mediaId=media.id;
 journal.mediaUrl=media.source_url;
 save();
 assert(media.source_url && imagePath(media.source_url).endsWith('/'+filename),'Wrong uploaded Media identity');
 if(String(media.alt_text||'')!==alt){
  media=await rest('/wp-json/wp/v2/media/'+media.id,{alt_text:alt});
  assert.equal(media.alt_text,alt,'Media ALT update mismatch');
 }
 const pathName=imagePath(media.source_url);
 const img='<img src="'+quote(pathName)+'" alt="'+quote(alt)+'" width="420" height="525" />';
 const expected=original.map(row=>[...row]);
 expected[2][mobileCol]='0';
 expected[3][mobileCol]='0';
 const mobile=Array(fields.length).fill('');
 mobile[imageCol]=img;
 mobile[mobileCol]='1';
 mobile[fields.indexOf('link')]='/san-pham';
 mobile[fields.indexOf('show_text')]='0';
 expected.push(mobile);
 assert.equal((mobile[imageCol].match(/<img\b/gi)||[]).length,1,'Mobile cell not single IMG');
 if(JSON.stringify(original)!==JSON.stringify(expected)){
  await page.evaluate(rows=>{window.tp.editor.setData(rows);window.tp.helpers.unsaved_changes.set();},expected);
  assert.deepEqual(await page.evaluate(()=>window.tp.editor.getData()),expected,'Draft differs from expected');
  await page.getByRole('button',{name:'Save Changes'}).first().click();
  await page.waitForTimeout(2500);
  journal.changed=true;save();
 }
 await page.goto(editorUrl,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData),null,{timeout:30000});
 const finalGrid=await page.evaluate(()=>window.tp.editor.getData());
 assert.deepEqual(finalGrid,expected,'Native TablePress save/readback mismatch');
 for(let i=0;i<2;i++)assert.equal(finalGrid[i+2][imageCol],original[i+2][imageCol],'Existing desktop image mutated');
 assert.deepEqual(finalGrid.slice(2).map(r=>r[mobileCol]),['0','0','1'],'Device flags mismatch');
 const mediaReadback=await rest('/wp-json/wp/v2/media/'+media.id+'?context=edit');
 assert.equal(imagePath(mediaReadback.source_url),pathName);
 assert.equal(mediaReadback.alt_text,alt);
 journal.status='PASS';
 journal.finishedAt=new Date().toISOString();
 journal.mobilePath=pathName;
 journal.tableRows=finalGrid.length;
 save();
 fs.writeFileSync(output+'/after.json',JSON.stringify({media:{id:media.id,source_url:media.source_url,alt_text:alt},grid:finalGrid},null,2)+'\n');
 console.log('HOME00_MOBILE_CMS_PASS='+JSON.stringify({tableId,mediaId:media.id,mediaCreated:journal.mediaCreated,
  originalDesktopImagesPreserved:2,mobileSlides:1,deviceFlags:['0','0','1'],tableRows:finalGrid.length}));
})().catch(e=>{journal.status='FAIL';journal.error=String(e.stack||e);save();console.error('HOME00_MOBILE_CMS_FAIL='+journal.error);process.exitCode=1;}).finally(async()=>{await browser?.close().catch(()=>{});});
