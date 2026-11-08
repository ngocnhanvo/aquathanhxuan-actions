'use strict';
// Guarded creation of Home 06 / Home 07 ESC Table parents and nested Product
// children. Native WordPress Insert Code owns Page 82454. No other CMS writes.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const WP='https://admin.aquathanhxuan.io.vn';
const HOME=82454;
const FILTER_IDS=[350156,269169,269168,269165,269143,269140,269105,269102,267192,267189];
const LIGHT_IDS=[350158,350149,350144,350137,269193,269138,269135,267097,267093];
const CONFIG=[
  {id:'home_06',child:'tool_home06products',title:'Máy lọc',slug:'may-loc',sourceIds:FILTER_IDS},
  {id:'home_07',child:'tool_home07products',title:'Đèn',slug:'den',sourceIds:LIGHT_IDS}
];
assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WordPress credentials');
const mapping=JSON.parse(fs.readFileSync('chatgpt/equipment-products-migration.json','utf8'));
assert.equal(mapping.count,19,'Importer must verify all 19 source products first');
assert(Array.isArray(mapping.mappings)&&mapping.mappings.length===19,'Product source mapping missing');
const mapped=new Map(mapping.mappings.map(x=>[Number(x.source_id),x]));
assert.equal(mapped.size,19,'Product source mappings not unique');
assert.deepEqual([...mapped.keys()].sort((a,b)=>a-b),[...FILTER_IDS,...LIGHT_IDS].sort((a,b)=>a-b));
const editTable=id=>WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+id;
const editPage=WP+'/wp-admin/post.php?post='+HOME+'&action=edit&esc_full_admin=1';
const normalize=s=>String(s||'').normalize('NFC').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().toLocaleLowerCase('vi');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();
  page.setDefaultTimeout(22000);
  page.on('dialog',async d=>{if(d.type()==='beforeunload')await d.accept();else await d.dismiss()});
  const get=async path=>{
    const res=await page.request.get(WP+path,{timeout:35000,failOnStatusCode:false});
    let data=null;try{data=await res.json()}catch{}
    return {status:res.status(),data};
  };
  const readTable=async id=>{
    const r=await get('/wp-json/tablepress/v1/table/'+id+'?_esc_verify='+Date.now());
    if(r.status===404)return null;
    assert.equal(r.status,200,'ESC Table REST failed '+id);
    return r.data;
  };
  const createTable=async({id,name,description,keys,labels,rows,api})=>{
    assert.equal(keys.length,labels.length,'ESC Table schema label mismatch');
    assert(rows.every(row=>row.length===keys.length),'ESC Table row width mismatch');
    let table=await readTable(id);
    if(table){
      assert.equal(String(table.meta?.api||''),api,'Existing table uses another API '+id);
      assert(Array.isArray(table.items),'Existing ESC Table items missing '+id);
      assert.equal(table.items.length,rows.length,'Existing table item count differs; do not overwrite '+id);
      for(let i=0;i<rows.length;i++)
        for(let c=0;c<keys.length;c++)
          assert.equal(String(table.items[i][keys[c]]||''),String(rows[i][c]||''),
            'Existing curated value changed '+id+' row '+i+' field '+keys[c]);
      console.log('EQUIPMENT_TABLE_REUSED='+id);
      return;
    }
    await page.goto(WP+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded',timeout:45000});
    await page.locator('[name="table[name]"]').fill(name);
    await page.locator('[name="table[description]"]').fill(description);
    await page.locator('[name="table[rows]"]').fill(String(rows.length+2));
    await page.locator('[name="table[columns]"]').fill(String(keys.length));
    await page.getByRole('button',{name:'Add Table'}).click();
    await page.waitForURL(u=>u.searchParams.get('action')==='edit'&&Boolean(u.searchParams.get('table_id')),{timeout:45000});
    const generated=new URL(page.url()).searchParams.get('table_id');
    assert(/^[a-zA-Z0-9_-]+$/.test(generated||''),'Invalid native generated table ID');
    const nonce=(await page.content()).match(/edit_table:\s*'([^']+)'/)?.[1];
    assert(nonce,'Missing native TablePress save nonce for '+id);
    const grid=[keys,labels,...rows];
    const form=new URLSearchParams();
    for(const [key,value] of [
      ['action','tablepress_save_table'],['_ajax_nonce',nonce],
      ['tablepress[id]',generated],['tablepress[new_id]',id],
      ['tablepress[name]',name],['tablepress[description]',description],
      ['tablepress[data]',JSON.stringify(grid)],['tablepress[options]','{}'],
      ['tablepress[visibility]',JSON.stringify({rows:grid.map(()=>1),columns:keys.map(()=>1)})],
      ['tablepress[number][rows]',String(grid.length)],
      ['tablepress[number][columns]',String(keys.length)],
      ['custom_api',api],['custom_image',''],['custom_cols',''],['custom_rows','']
    ])form.append(key,value);
    const result=await page.evaluate(async body=>{
      const res=await fetch('/wp-admin/admin-ajax.php',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body});
      return {status:res.status,result:await res.json()};
    },form.toString());
    assert(result.status===200&&result.result?.success===true&&result.result?.table_id===id,
      'Native TablePress save failed '+id+': '+JSON.stringify(result));
    table=await readTable(id);
    assert(table && String(table.meta?.api||'')===api,'New table readback failed '+id);
    assert.equal(table.items?.length,rows.length,'New ESC Table row readback count '+id);
    for(let i=0;i<rows.length;i++)
      for(let c=0;c<keys.length;c++)
        assert.equal(String(table.items[i][keys[c]]||''),String(rows[i][c]||''),
          'New ESC Table readback mismatch '+id+' row '+i+' field '+keys[c]);
    console.log('EQUIPMENT_TABLE_CREATED='+id);
  };
  try{
    await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded',timeout:45000});
    if(await page.locator('#user_login').count()){
      await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
      await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
    }
    await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
    for(const config of CONFIG){
      const cat=await get('/wp-json/wp/v2/product_cat?slug='+config.slug);
      assert.equal(cat.status,200,'Destination taxonomy unavailable');
      assert(Array.isArray(cat.data)&&cat.data.length===1,'Unexpected equipment category '+config.slug);
      assert.equal(Number(cat.data[0].parent),0,'Equipment category is not root');
      const wanted=config.sourceIds.map(sourceId=>{
        const item=mapped.get(sourceId);
        assert(item && /^\d+$/.test(String(item.target_id)),'Missing imported Product '+sourceId);
        return String(item.target_id);
      });
      assert.equal(new Set(wanted).size,wanted.length,'Duplicate target Product references');
      for(const sourceId of config.sourceIds){
        const item=mapped.get(sourceId);
        const live=await get('/wp-json/wc/store/v1/products/'+item.target_id);
        assert.equal(live.status,200,'Imported target Product is not published '+sourceId);
        assert.equal(live.data?.slug,item.slug,'Imported Product slug changed '+sourceId);
        assert.equal(normalize(live.data?.name),normalize(item.name),'Imported Product title changed '+sourceId);
        const ids=(live.data?.categories||[]).map(x=>Number(x.id));
        assert(ids.includes(Number(cat.data[0].id)),'Imported Product lacks required root taxonomy '+sourceId);
      }
      const childRows=wanted.map(id=>[id]);
      await createTable({
        id:config.child,name:config.title+' - sản phẩm',description:'ESC Table con Product, chỉ quản lý tham chiếu từ '+config.id,
        keys:['key'],labels:['Sản phẩm'],rows:childRows,api:'Product'
      });
      await createTable({
        id:config.id,name:'Trang chủ - '+config.title,
        description:'Danh mục sản phẩm '+config.title+' có ESC Table con dành cho Visual Builder',
        keys:['title','description','image','button_label','button_href','shortcode-products'],
        labels:['Tiêu đề','Mô tả','Ảnh nền','Nhãn nút','Liên kết nút','Danh sách sản phẩm'],
        rows:[[config.title,'','','Xem tất cả','/san-pham/'+config.slug,config.child]],
        api:''
      });
      const parent=await readTable(config.id);
      assert.equal(parent.items[0]['shortcode-products'],config.child,'Parent-child shortcode reference missing');
      console.log('EQUIPMENT_PARENT_CHILD_PASS='+config.id+' => '+config.child+' count='+wanted.length);
    }
    // Use the actual WordPress native Insert Code button; do not paste shortcode
    // strings into Page HTML and do not re-author any of the six existing sections.
    await page.goto(editPage,{waitUntil:'domcontentloaded',timeout:45000});
    const pageBefore=await page.locator('#content').inputValue();
    const oldShortcodes=[...pageBefore.matchAll(/\[table\s+id=['"]?([a-zA-Z0-9_-]+)/g)].map(m=>m[1]);
    const expectedPrevious=['home_00','home_01','home_02','home_03','home_04','home_05'];
    const newShortcodes=CONFIG.map(c=>c.id);
    const changed=newShortcodes.filter(id=>!oldShortcodes.includes(id));
    for(const id of newShortcodes)
      assert(oldShortcodes.filter(x=>x===id).length<=1,'Duplicate existing Page shortcode '+id);
    assert.deepEqual(oldShortcodes.filter(x=>expectedPrevious.includes(x)),expectedPrevious,
      'Homepage baseline section order has changed');
    assert(oldShortcodes.every(x=>[...expectedPrevious,...newShortcodes].includes(x)),
      'Unexpected shortcode on Page; manual review required');
    if(changed.length){
      const editor=await page.evaluate(()=>{
        const e=window.tinymce?.get('content');
        if(e&&!e.isHidden())e.hide();
        return {hidden:!e||e.isHidden()};
      });
      assert(editor.hidden,'Native WordPress Text editor was not released');
      const baseline=await page.locator('#content').inputValue();
      assert.equal(baseline,pageBefore,'Native editor toggling altered Page content');
      for(const id of changed){
        const prior=await page.locator('#content').inputValue();
        const previous=id==='home_06'?'home_04':'home_06';
        const previousShortcode='[table id='+previous+' /]';
        const token=prior.indexOf(previousShortcode);
        assert(token>=0,'Cannot find previous section '+previous);
        const wrapperStart=prior.lastIndexOf('<div',token);
        const wrapperEnd=prior.indexOf('</div>',token);
        assert(wrapperStart>=0&&wrapperEnd>token,'Previous native Insert Code wrapper missing');
        assert(/tablepress-preview-wrap/.test(prior.slice(wrapperStart,token)),
          'Previous section lacks native Insert Code wrapper');
        const cursor=wrapperEnd+6;
        await page.evaluate(index=>{
          const el=document.getElementById('content');
          if(!(el instanceof HTMLTextAreaElement))throw Error('Classic Editor textarea missing');
          el.focus();el.setSelectionRange(index,index);window.wpActiveEditor='content';
        },cursor);
        const button=page.locator('#qt_content_tablepress_quicktags_button');
        await button.waitFor({state:'visible',timeout:18000});
        await button.click();
        const shortcode='[table id='+id+' /]';
        const picker=page.frameLocator('#TB_iframeContent').locator('input.insert-shortcode[title="'+shortcode+'"]');
        await picker.waitFor({state:'visible',timeout:18000});
        await picker.click();
        await page.waitForFunction(needle=>document.getElementById('content')?.value.includes(needle),shortcode,{timeout:25000});
        const after=await page.locator('#content').inputValue();
        assert.equal(after.split(shortcode).length-1,1,'Duplicate native insertion '+id);
        const position=after.indexOf(shortcode);
        const start=after.lastIndexOf('<div',position),end=after.indexOf('</div>',position)+6;
        assert(start>=0&&end>position,'Native wrapper boundaries missing '+id);
        const wrapper=after.slice(start,end);
        assert(wrapper.includes('tablepress-preview-wrap')&&wrapper.includes('data-table-id="'+id+'"'),
          'Insert Code produced a non-native wrapper '+id);
        assert(!/<script\b|<iframe\b/i.test(wrapper),'Unexpected executable markup in inserted wrapper');
        assert.equal(after.slice(0,start)+after.slice(end),prior,
          'Native insertion modified unrelated Page content '+id);
        console.log('EQUIPMENT_NATIVE_INSERT_PASS='+id);
      }
      const finalText=await page.locator('#content').inputValue();
      const finalIDs=[...finalText.matchAll(/\[table\s+id=['"]?([a-zA-Z0-9_-]+)/g)].map(m=>m[1]);
      assert.deepEqual(finalIDs,['home_00','home_01','home_02','home_03','home_04','home_06','home_07','home_05'],
        'New homepage section insertion order incorrect');
      await page.locator('#publish').click();
      await page.waitForTimeout(1900);
      const context=await browser.newContext();
      await context.addCookies(await page.context().cookies());
      const verifyPage=await context.newPage();
      await verifyPage.goto(editPage,{waitUntil:'domcontentloaded',timeout:45000});
      const readback=await verifyPage.locator('#content').inputValue();
      assert.equal(readback,finalText,'Homepage native read-after-write mismatch');
      await context.close();
    } else console.log('EQUIPMENT_NATIVE_PAGE=ALREADY_PRESENT');
    const check=await page.goto(editPage,{waitUntil:'domcontentloaded',timeout:45000});
    const persisted=await page.locator('#content').inputValue();
    const final=[...persisted.matchAll(/\[table\s+id=['"]?([a-zA-Z0-9_-]+)/g)].map(m=>m[1]);
    assert.deepEqual(final,['home_00','home_01','home_02','home_03','home_04','home_06','home_07','home_05']);
    console.log('EQUIPMENT_SECTIONS_CMS_PASS='+JSON.stringify({
      page:HOME,parents:CONFIG.map(x=>x.id),children:CONFIG.map(x=>x.child),
      sourceCount:19,shortcodes:final
    }));
  }catch(e){console.error('EQUIPMENT_SECTIONS_CMS_FAIL='+e.stack);process.exitCode=1}
  finally{await browser.close()}
})().catch(e=>{console.error('EQUIPMENT_SECTIONS_FATAL='+e.stack);process.exitCode=1});
