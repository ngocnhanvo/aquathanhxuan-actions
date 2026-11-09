'use strict';
// WRITE_SCOPE: five new Aqua support Pages, five new support_* native ESC Tables,
// and exactly five href cells in pre-existing pub_aquafooterlinks.
// No products, original Page data, other tables or test records are mutated.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const WP='https://admin.aquathanhxuan.io.vn';
assert(process.env.WP_ADMIN_USERNAME&&process.env.WP_ADMIN_PASSWORD,'Missing WP admin credentials');

const defs=[
 {
  slug:'chinh-sach-doi-tra-hang',title:'Chính sách đổi trả hàng',key:'support-policy',table:'support_policy',
  description:'Hướng dẫn kiểm tra đơn hàng, chuẩn bị thông tin và gửi yêu cầu hỗ trợ đổi trả sản phẩm tại Aqua Thanh Xuân.',
  items:[
   ['lead','Yên tâm từ lúc nhận hàng','Khi cần đổi trả hoặc báo sản phẩm có vấn đề, hãy liên hệ Aqua Thanh Xuân cùng thông tin đơn hàng. Chúng tôi sẽ kiểm tra nguyên nhân, tình trạng sản phẩm và hướng xử lý phù hợp.',''],
   ['heading','Các trường hợp cần liên hệ đổi trả','Giữ lại thông tin và hình ảnh để đội ngũ có thể xác minh nhanh hơn.',''],
   ['feature','Giao sai sản phẩm','Mã hàng, mẫu mã hoặc số lượng thực nhận khác với thông tin đơn hàng đã xác nhận.','package-x'],
   ['feature','Hàng hỏng khi nhận','Bao bì hoặc sản phẩm có dấu hiệu va đập, hư hỏng hay rò rỉ trong quá trình vận chuyển.','package-check'],
   ['feature','Lỗi hoặc vấn đề chất lượng','Sản phẩm xuất hiện bất thường khi sử dụng đúng hướng dẫn; việc xử lý cần đối chiếu bảo hành và điều kiện của nhà sản xuất.','shield-check'],
   ['heading','Các bước gửi yêu cầu','Thực hiện theo thứ tự để tránh thiếu thông tin trong quá trình hỗ trợ.',''],
   ['step','Kiểm tra sản phẩm khi nhận','Đối chiếu loại hàng, số lượng, ngoại quan và phụ kiện theo đơn đã xác nhận.',''],
   ['step','Ghi lại thông tin cần thiết','Chuẩn bị mã đơn, hình ảnh hoặc video tình trạng thực tế, hóa đơn và tem nhãn nếu có.',''],
   ['step','Liên hệ kênh hỗ trợ','Gửi mô tả sự việc qua hotline, Zalo hoặc các kênh liên hệ chính thức trên website.',''],
   ['step','Xác nhận phương án xử lý','Đội ngũ trao đổi kết quả kiểm tra, hình thức đổi trả hoặc bảo hành áp dụng cho từng sản phẩm.',''],
   ['heading','Câu hỏi thường gặp','',''],
   ['faq','Tôi nên giữ lại những gì?','Nên giữ sản phẩm, phụ kiện đi kèm, bao bì, hóa đơn hoặc mã đơn và chứng cứ tình trạng khi nhận cho đến khi có hướng dẫn xử lý.',''],
   ['faq','Cây, cá và các sinh vật sống có áp dụng như thiết bị không?','Đặc tính vận chuyển và bảo quản của sinh vật sống khác hàng thiết bị. Vui lòng liên hệ ngay khi nhận để được đối chiếu điều kiện cụ thể của loại hàng và tình trạng thực tế.',''],
   ['note','Điều kiện áp dụng','Việc đổi trả, chi phí vận chuyển và phương án hoàn tiền (nếu có) được xác minh theo từng đơn hàng, điều kiện sản phẩm, chính sách nhà sản xuất và quy định pháp luật hiện hành; nội dung này không thay thế quyền lợi theo pháp luật của khách hàng.','']
  ]
 },
 {
  slug:'gioi-thieu',title:'Giới thiệu',key:'support-about',table:'support_about',
  description:'Tìm hiểu cách Aqua Thanh Xuân đồng hành cùng cộng đồng yêu thích hồ cá cảnh và nghệ thuật thủy sinh.',
  items:[
   ['lead','Nuôi dưỡng một thế giới xanh dưới nước','Aqua Thanh Xuân hướng đến trải nghiệm lựa chọn thiết bị, vật liệu và phụ kiện thủy sinh rõ ràng, dễ tiếp cận cho người mới bắt đầu lẫn người đã có kinh nghiệm.',''],
   ['heading','Chúng tôi hướng đến điều gì?','Mỗi hồ thủy sinh có nhu cầu khác nhau. Từ hệ thống chiếu sáng đến nền, lọc và chăm sóc, lựa chọn phù hợp quan trọng hơn lựa chọn nhiều nhất.',''],
   ['feature','Lựa chọn đúng nhu cầu','Ưu tiên tìm hiểu kích thước hồ, mục tiêu bố cục, ngân sách và kinh nghiệm chăm sóc trước khi đề xuất sản phẩm.','sliders-horizontal'],
   ['feature','Thông tin rõ ràng','Giới thiệu công dụng, cách sử dụng và những điểm cần lưu ý để người chơi có thêm cơ sở lựa chọn.','book-open-check'],
   ['feature','Đồng hành cùng người chơi','Hỗ trợ trao đổi vấn đề thường gặp khi bố trí hồ, chọn lọc, đèn và vật liệu phù hợp.','handshake'],
   ['feature','Tôn trọng hệ sinh thái','Khuyến khích chăm sóc sinh vật có trách nhiệm và lựa chọn giải pháp phù hợp với điều kiện từng bể.','sprout'],
   ['heading','Một hồ đẹp bắt đầu từ nền tảng tốt','',''],
   ['step','Hình dung phong cách','Xác định hồ cây, hồ cá hay bố cục thiên nhiên và các điều kiện không gian thực tế.',''],
   ['step','Chọn thiết bị cốt lõi','Tìm hiểu ánh sáng, hệ lọc, nền, vật liệu và khả năng vận hành ổn định.',''],
   ['step','Chăm sóc để duy trì','Theo dõi nước, sinh vật, cây và lịch bảo dưỡng nhằm giữ hồ phát triển lâu dài.',''],
   ['note','Khám phá sản phẩm','Danh mục thương hiệu, đèn, lọc, vật liệu và phụ kiện được cập nhật ngay trên website để bạn có thể tự tìm hiểu hoặc liên hệ tư vấn thêm.','']
  ]
 },
 {
  slug:'dai-ly',title:'Đại lý',key:'support-dealer',table:'support_dealer',
  description:'Cùng Aqua Thanh Xuân trao đổi cơ hội hợp tác phân phối sản phẩm và giải pháp phục vụ khách hàng yêu thủy sinh.',
  items:[
   ['lead','Cùng phát triển cộng đồng thủy sinh','Aqua Thanh Xuân tiếp nhận trao đổi từ các cửa hàng, đơn vị thi công và đối tác quan tâm đến lĩnh vực thủy sinh, hồ cá cảnh và thiết bị liên quan.',''],
   ['heading','Các hướng hợp tác có thể trao đổi','Thông tin về danh mục, điều kiện cung ứng và hình thức phối hợp sẽ được thống nhất trực tiếp theo nhu cầu thực tế.',''],
   ['feature','Cửa hàng và điểm bán','Trao đổi danh mục sản phẩm, nhu cầu trưng bày và khả năng cung ứng theo khu vực.','store'],
   ['feature','Đơn vị thiết kế, thi công','Cùng tìm giải pháp về ánh sáng, lọc, vật liệu và thiết bị cho từng công trình hồ cá hoặc hồ cây.','wrench'],
   ['feature','Đối tác kinh doanh','Trao đổi nhu cầu đặt hàng định kỳ, phối hợp giới thiệu sản phẩm và các phương án hợp tác phù hợp.','handshake'],
   ['heading','Quy trình kết nối','',''],
   ['step','Giới thiệu nhu cầu hợp tác','Chia sẻ tên cửa hàng hoặc đơn vị, địa bàn hoạt động, nhóm sản phẩm quan tâm và quy mô dự kiến.',''],
   ['step','Trao đổi danh mục và điều kiện','Hai bên đối chiếu khả năng cung ứng, sản phẩm, phương thức giao nhận và các yêu cầu liên quan.',''],
   ['step','Thống nhất cách phối hợp','Các điều kiện thương mại cụ thể chỉ có hiệu lực khi được hai bên xác nhận.',''],
   ['heading','Một số câu hỏi thường gặp','',''],
   ['faq','Có mức chiết khấu đại lý cố định không?','Các điều kiện thương mại phụ thuộc vào sản phẩm, số lượng và hình thức hợp tác, nên cần trao đổi trực tiếp thay vì áp dụng một mức chung.',''],
   ['faq','Đơn vị mới hoạt động có thể liên hệ không?','Có thể gửi thông tin giới thiệu và nhu cầu để đội ngũ xem xét phương án hợp tác phù hợp.',''],
   ['note','Bắt đầu trao đổi','Sử dụng hotline, Zalo hoặc email được hiển thị tại phần tư vấn để gửi thông tin hợp tác. Không cần công bố giấy tờ hay dữ liệu cá nhân nhạy cảm trên website.','']
  ]
 },
 {
  slug:'khieu-nai',title:'Khiếu nại',key:'support-complaint',table:'support_complaint',
  description:'Thông tin hướng dẫn phản ánh chất lượng sản phẩm, đơn hàng và trải nghiệm dịch vụ để Aqua Thanh Xuân kiểm tra, phản hồi.',
  items:[
   ['lead','Mọi phản ánh đều cần được lắng nghe','Khi có trải nghiệm chưa như mong đợi, bạn có thể gửi phản ánh kèm thông tin liên quan. Việc tiếp nhận và kiểm tra dựa trên nội dung, chứng cứ và tình trạng thực tế.',''],
   ['heading','Những nội dung có thể phản ánh','',''],
   ['feature','Đơn hàng và giao nhận','Thiếu hàng, sai mẫu, nhầm số lượng, tình trạng kiện hàng hoặc thông tin giao nhận chưa đúng.','package-search'],
   ['feature','Sản phẩm và bảo hành','Vấn đề về công năng, chất lượng, phụ kiện hoặc điều kiện bảo hành được thông tin chưa rõ.','shield-alert'],
   ['feature','Tư vấn và dịch vụ','Thông tin hỗ trợ chưa nhất quán hoặc trải nghiệm trao đổi cần được làm rõ.','messages-square'],
   ['heading','Quy trình xử lý phản ánh','Cung cấp thông tin đầy đủ giúp hạn chế phải bổ sung nhiều lần.',''],
   ['step','Gửi nội dung phản ánh','Nêu rõ sự việc, sản phẩm hoặc dịch vụ liên quan và mong muốn được hỗ trợ.',''],
   ['step','Cung cấp thông tin đối chiếu','Chuẩn bị mã đơn, thời điểm phát sinh và hình ảnh hoặc trao đổi có liên quan nếu có.',''],
   ['step','Tiếp nhận và xác minh','Đội ngũ kiểm tra thông tin, làm rõ với các bên liên quan và liên hệ bổ sung khi cần.',''],
   ['step','Trao đổi hướng giải quyết','Phản hồi phương án phù hợp theo tình huống thực tế và quyền lợi hợp pháp của khách hàng.',''],
   ['heading','Câu hỏi thường gặp','',''],
   ['faq','Không còn mã đơn thì có gửi phản ánh được không?','Bạn vẫn có thể liên hệ và cung cấp thông tin thay thế như số điện thoại mua hàng, thời gian và sản phẩm để đội ngũ hỗ trợ tra cứu khi khả thi.',''],
   ['faq','Tôi nên gửi bằng kênh nào?','Dùng một trong các kênh liên hệ chính thức được công bố trên website và giữ lại nội dung trao đổi để tiện theo dõi.',''],
   ['note','Lưu ý bảo mật','Không đăng mật khẩu, mã OTP, thông tin thẻ thanh toán hoặc dữ liệu nhạy cảm trong nội dung phản ánh.','']
  ]
 },
 {
  slug:'lien-he',title:'Liên hệ',key:'support-contact',table:'support_contact',
  description:'Kết nối với Aqua Thanh Xuân để được tư vấn lựa chọn sản phẩm, hỏi thông tin đơn hàng hoặc trao đổi hợp tác.',
  items:[
   ['lead','Một cuộc trò chuyện, nhiều giải pháp cho hồ cá','Bạn đang lựa chọn thiết bị cho bể mới, cần tìm vật liệu phù hợp hoặc muốn trao đổi về đơn hàng? Hãy chọn kênh liên hệ thuận tiện nhất bên cạnh.',''],
   ['heading','Aqua Thanh Xuân có thể hỗ trợ bạn','',''],
   ['feature','Tư vấn thiết bị','Trao đổi nhu cầu lựa chọn đèn, máy lọc, vật liệu, phụ kiện và các giải pháp cho hồ thủy sinh.','lightbulb'],
   ['feature','Hỏi về đơn hàng','Cung cấp mã đơn hoặc thông tin đặt hàng khi cần được hỗ trợ kiểm tra.','shopping-bag'],
   ['feature','Bảo hành và đổi trả','Chia sẻ tình trạng sản phẩm, ảnh chụp hoặc video để được hướng dẫn tiếp nhận.','shield-check'],
   ['feature','Hợp tác và đại lý','Gửi thông tin giới thiệu đơn vị cùng nhóm sản phẩm, thị trường hoặc hình thức hợp tác quan tâm.','handshake'],
   ['heading','Để việc trao đổi hiệu quả hơn','',''],
   ['step','Chọn nội dung cần hỗ trợ','Xác định câu hỏi về sản phẩm, đơn hàng, kỹ thuật hay cơ hội hợp tác.',''],
   ['step','Chuẩn bị thông tin liên quan','Có thể chuẩn bị kích thước bể, hình ảnh hiện trạng hoặc mã đơn tùy nội dung trao đổi.',''],
   ['step','Liên hệ qua kênh phù hợp','Sử dụng các nút gọi, Zalo, email hoặc Facebook được công bố trên website.',''],
   ['note','An toàn thông tin','Chỉ chia sẻ dữ liệu cần thiết để xử lý yêu cầu; không cung cấp mật khẩu, mã OTP hay thông tin thẻ thanh toán.','']
  ]
 }
];
const expectedLinks=Object.fromEntries(defs.map(d=>[d.title==='Đại lý'?'Đại Lý':d.title,'/'+d.slug]));
const header=['kind','title','description','lucide-icon'];
const labels=['Loại khối','Tiêu đề','Mô tả','Biểu tượng'];
const rowsFor=(d)=>[header,labels,...d.items];
const editTable=(id)=>WP+'/wp-admin/admin.php?page=tablepress&action=edit&table_id='+id;
const wpApi=(path)=>WP+'/wp-json'+path;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.setDefaultTimeout(25000);page.setDefaultNavigationTimeout(45000);
 page.on('dialog',async d=>{if(d.type()==='beforeunload'||d.type()==='confirm')await d.accept();else await d.dismiss()});
 const outcome={createdTables:[],existingTables:[],createdPages:[],existingPages:[],footerChanged:false};
 try{
  await page.goto(WP+'/wp-login.php',{waitUntil:'domcontentloaded'});
  if(await page.locator('#user_login').count()){
   await page.locator('#user_login').fill(process.env.WP_ADMIN_USERNAME);
   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD);
   await page.locator('#wp-submit').click();
  }
  await page.waitForURL(u=>u.pathname.startsWith('/wp-admin/'),{timeout:45000});
  console.log('SUPPORT_AUTH_PASS');
  for(const d of defs){
   const get=async()=>page.request.get(wpApi('/tablepress/v1/table/'+d.table)+'?qa='+Date.now(),{timeout:40000});
   const existing=await get();
   if(existing.status()===200){
    const json=await existing.json();
    assert.deepEqual(json.fields?.map(x=>x.key),header,'Existing Table schema mismatch: '+d.table);
    assert((json.items||[]).length>0,'Existing Table has no content: '+d.table);
    outcome.existingTables.push(d.table);
    console.log('SUPPORT_TABLE_ALREADY_EXISTS='+d.table+' items='+json.items.length);
    continue;
   }
   assert.equal(existing.status(),404,'Unexpected Table API response: '+d.table);
   await page.goto(WP+'/wp-admin/admin.php?page=tablepress_add',{waitUntil:'domcontentloaded'});
   await page.locator('[name="table[name]"]').fill('Hỗ trợ - '+d.title);
   await page.locator('[name="table[description]"]').fill('Các khối nội dung của trang '+d.title+' (quản lý qua ESC Table / Visual Builder)');
   await page.locator('[name="table[rows]"]').fill(String(d.items.length+2));
   await page.locator('[name="table[columns]"]').fill('4');
   await page.getByRole('button',{name:'Add Table'}).click();
   await page.waitForURL(u=>u.searchParams.get('action')==='edit'&&u.searchParams.has('table_id'),{timeout:45000});
   const tempId=new URL(page.url()).searchParams.get('table_id');
   assert(/^[a-zA-Z0-9_-]+$/.test(tempId),'Invalid temporary Table ID');
   console.log('SUPPORT_NATIVE_TABLE_ALLOCATED='+JSON.stringify({table:d.table,generated:tempId}));
   await page.waitForFunction(()=>Boolean(window.tp?.editor?.setData),null,{timeout:20000});
   await page.locator('#table-id').fill(d.table);
   await page.locator('#table-id').press('Tab');
   await page.evaluate(rows=>{window.tp.editor.setData(rows);window.tp.helpers.unsaved_changes.set()},rowsFor(d));
   assert.deepEqual(await page.evaluate(()=>window.tp.editor.getData()),rowsFor(d),'Native grid data mismatch '+d.table);
   await page.getByRole('button',{name:'Save Changes'}).first().click();
   await sleep(1400);
   await page.goto(editTable(d.table),{waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData));
   const saved=await page.evaluate(()=>({id:document.querySelector('#table-id')?.value,rows:window.tp.editor.getData()}));
   assert.equal(saved.id,d.table,'Table rename not saved');
   assert.deepEqual(saved.rows,rowsFor(d),'Table read-after-write mismatch '+d.table);
   outcome.createdTables.push(d.table);
   console.log('SUPPORT_NATIVE_TABLE_PASS='+d.table+' rows='+d.items.length);
  }

  for(const d of defs){
   const response=await page.request.get(wpApi('/wp/v2/pages?slug='+encodeURIComponent(d.slug)+'&status=publish&per_page=10'));
   assert.equal(response.status(),200,'Cannot check existing pages');
   const rows=await response.json();
   if(rows.length){
    assert.equal(rows.length,1,'Multiple pages with slug '+d.slug);
    const old=rows[0];
    assert.equal(old.acf?.action,'SupportPage','Existing Page has unexpected Action: '+d.slug);
    assert.equal(old.acf?.key,d.key,'Existing Page has unexpected key: '+d.slug);
    assert(String(old.content?.rendered || '').includes(d.table),'Existing Page has no matching native shortcode '+d.table);
    outcome.existingPages.push({id:old.id,slug:d.slug});
    console.log('SUPPORT_PAGE_ALREADY_EXISTS='+d.slug+' id='+old.id);
    continue;
   }
   await page.goto(WP+'/wp-admin/post-new.php?post_type=page',{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('#title').fill(d.title);
   await page.locator('[data-name="action"] input').fill('SupportPage');
   await page.locator('[data-name="key"] input').fill(d.key);
   await page.locator('[data-name="product_lang"] select').selectOption('vi');
   // WordPress native TablePress Insert Code, not a hand-inserted shortcode.
   await page.evaluate(()=>{
     const tinymceEditor=window.tinymce?.get('content');
     if(tinymceEditor&&!tinymceEditor.isHidden())tinymceEditor.hide();
     const wrap=document.getElementById('wp-content-wrap');
     if(!wrap)throw Error('Missing Classic Editor wrapper');
     wrap.classList.remove('tmce-active');wrap.classList.add('html-active');
     const textarea=document.getElementById('content');
     if(!(textarea instanceof HTMLTextAreaElement))throw Error('Missing Page editor textarea');
     textarea.focus();textarea.setSelectionRange(textarea.value.length,textarea.value.length);
     window.wpActiveEditor='content';
   });
   const button=page.locator('#qt_content_tablepress_quicktags_button');
   await button.waitFor({state:'attached',timeout:15000});
   await button.evaluate(el=>el.click());
   const shortcode='[table id='+d.table+' /]';
   const picker=page.frameLocator('#TB_iframeContent').locator('input.insert-shortcode[title="'+shortcode+'"]');
   await picker.waitFor({state:'visible',timeout:20000});
   await picker.click();
   await page.waitForFunction(token=>document.querySelector('#content')?.value.includes(token),shortcode,{timeout:20000});
   const html=await page.locator('#content').inputValue();
   assert(html.includes('tablepress-preview-wrap')&&html.includes('data-table-id="'+d.table+'"'),
     'Native Insert Code wrapper incomplete '+d.table);
   assert.equal((html.match(/\[table id=/g)||[]).length,1,'Unexpected shortcode count '+d.slug);
   // Old WordPress meta-box SEO inputs may be absent when Yoast uses the React panel.
   // Only write the native field when it is actually present.
   const seoTitle=page.locator('#yoast_wpseo_title');
   const seoDesc=page.locator('#yoast_wpseo_metadesc');
   if(await seoTitle.count())await seoTitle.fill(d.title+' | Aqua Thanh Xuân');
   if(await seoDesc.count())await seoDesc.fill(d.description);
   await page.locator('#publish').click();
   await page.waitForTimeout(2000);
   let published=null;
   for(let attempt=0;attempt<5;attempt++){
     const check=await page.request.get(wpApi('/wp/v2/pages?slug='+encodeURIComponent(d.slug)+'&status=publish&per_page=10'));
     if(check.ok()){
       const fresh=await check.json();
       if(fresh.length===1){published=fresh[0];break;}
     }
     await sleep(950);
   }
   assert(published,'New Page missing from published WP REST: '+d.slug);
   assert.equal(published.acf?.action,'SupportPage','ACF Action not saved: '+d.slug);
   assert.equal(published.acf?.key,d.key,'ACF key not saved: '+d.slug);
   assert.equal(published.acf?.product_lang?.value || published.acf?.product_lang,'vi','Wrong Page locale: '+d.slug);
   assert(String(published.content?.rendered||'').includes(d.table),'Native shortcode missing from saved WP page: '+d.slug);
   outcome.createdPages.push({id:published.id,slug:d.slug});
   console.log('SUPPORT_NATIVE_PAGE_PASS='+JSON.stringify({id:published.id,slug:d.slug,table:d.table,action:published.acf.action}));
  }

  // Only after all five Pages are published and verified, activate the footer links.
  const savedPages=[...outcome.createdPages,...outcome.existingPages];
  assert.equal(savedPages.length,5,'Cannot activate footer before all five verified Pages exist');
  await page.goto(editTable('pub_aquafooterlinks'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData));
  const original=await page.evaluate(()=>window.tp.editor.getData());
  assert.deepEqual(original[0],['group','label','href'],'Footer schema unexpectedly changed');
  const updated=original.map(row=>row.slice());
  let changes=0;
  for(const def of defs){
    const label=def.title==='Đại lý'?'Đại Lý':def.title;
    const indices=updated.flatMap((row,index)=>row[0]==='support'&&row[1]===label?[index]:[]);
    assert.equal(indices.length,1,'Unexpected support footer label '+label);
    const index=indices[0],target='/'+def.slug;
    const current=String(updated[index][2]||'');
    assert(current===''||current==='#footer-contact'||current===target,
      'Footer href was changed by another actor: '+label);
    if(current!==target){updated[index][2]=target;changes++;}
  }
  if(changes){
    await page.evaluate(rows=>{window.tp.editor.setData(rows);window.tp.helpers.unsaved_changes.set()},updated);
    await page.getByRole('button',{name:'Save Changes'}).first().click();
    await sleep(1500);
    outcome.footerChanged=true;
  }
  await page.goto(editTable('pub_aquafooterlinks'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.tp?.editor?.getData));
  assert.deepEqual(await page.evaluate(()=>window.tp.editor.getData()),updated,'Footer link read-after-write mismatch');
  console.log('SUPPORT_FOOTER_LINKS_PASS='+JSON.stringify({links:defs.map(d=>'/'+d.slug),updated:changes}));
  console.log('SUPPORT_CMS_WRITE_SCOPE_PASS='+JSON.stringify(outcome));
 }catch(e){
  console.error('SUPPORT_CMS_WRITE_FAILED='+e.stack);
  console.error('SUPPORT_CMS_PARTIAL_PROGRESS='+JSON.stringify(outcome));
  process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error('SUPPORT_CMS_FATAL='+e.stack);process.exitCode=1;});
