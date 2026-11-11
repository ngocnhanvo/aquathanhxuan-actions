'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base='https://aquathanhxuan.io.vn';
const sha='a41f9af898f11ca7dbf357aeb1f972d34efaf7db';
const out='artifacts/aqua-agent-storefront';
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const markerRes=await fetch(base+'/aquathanhxuan-staging-build.json?agentqa='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
  assert.equal(markerRes.status,200,'Production marker missing');
  assert.equal((await markerRes.json()).commit,sha,'Wrong Astro production commit');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    // Read-only probe: live Astro session and WordPress history must agree.
    const probe=await browser.newContext();
    try{
      const first=await probe.request.get(base+'/api/agent/history');
      assert.equal(first.status(),200,'Initial history API failure');
      assert.deepEqual(await first.json(),[],'New session should have no history');
      const second=await probe.request.get(base+'/api/agent/history');
      assert.equal(second.status(),200,'WordPress-backed history API failure');
      assert(Array.isArray(await second.json()),'History response should be an array');
      console.log('AQUA_AGENT_READONLY_HISTORY_PASS');
    }finally{await probe.close()}

    for(const [width,height] of [[390,844],[926,760],[1440,900]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2});
      const page=await context.newPage();
      const network=[];
      page.on('pageerror',e=>network.push('ERROR '+String(e)));
      await page.route('**/api/agent/history',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
      let clearMethod='';
      await page.route('**/api/agent/history-clear',route=>{
        clearMethod=route.request().method();
        return route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});
      });
      await page.route('**/api/agent/chat',route=>route.fulfill({
        status:200,contentType:'application/json',
        body:JSON.stringify({reply:'Mời bạn tham khảo [đèn thủy sinh](/san-pham/den-thuy-sinh). <img src=x onerror="window.__badAgentHtml=true"><script>window.__badAgentHtml=true</script> [link không an toàn](javascript:alert(1))'})
      }));
      try{
        await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
        const launcher=page.locator('#ai-agent-btn');
        await launcher.waitFor({state:'visible',timeout:20000});
        await launcher.click();
        const menu=page.locator('#consultation-menu');
        assert.equal(await menu.getAttribute('aria-hidden'),'false','Consultation menu not opened');
        assert((await menu.innerText()).includes('Kênh tư vấn'),'Unverified 24/7 claim still shown');
        await page.locator('#open-agent-from-consultation').click();
        const chat=page.locator('#ai-chat-box');
        await chat.waitFor({state:'visible',timeout:15000});
        await page.waitForFunction(()=>document.querySelector('#chat-messages')?.textContent?.includes('Xin chào'),null,{timeout:15000});
        assert((await chat.innerText()).includes('Trợ lý thủy sinh'),'Aqua agent title missing');
        assert(/Thanh Xuân/i.test(await chat.innerText()),'WordPress brand missing in welcome');
        const input=page.locator('#chat-input');
        assert.equal(await input.getAttribute('maxlength'),'2000');
        await input.fill('Tôi cần đèn thủy sinh');
        await page.locator('#send-btn').click();
        const safeLink=page.locator('#chat-messages a[href*="/san-pham/den-thuy-sinh"]');
        await safeLink.waitFor({state:'visible',timeout:15000});
        assert.equal(await page.locator('#chat-messages img').count(),0,'Untrusted response image must be stripped');
        assert.equal(await page.locator('#chat-messages script').count(),0,'Untrusted script must be stripped');
        assert.equal(await page.evaluate(()=>Boolean(window.__badAgentHtml)),false,'Agent response executed injected code');
        assert.equal(await page.locator('#chat-messages a[href^="javascript:"]').count(),0,'Unsafe link passed through');
        page.once('dialog',dialog=>dialog.accept());
        await page.locator('#clear-chat-btn').click();
        await page.waitForFunction(()=>document.querySelector('#chat-messages')?.textContent?.includes('Xin chào') &&
          !document.querySelector('#chat-messages')?.textContent?.includes('Tôi cần đèn thủy sinh'),null,{timeout:12000});
        assert.equal(clearMethod,'POST','Chat reset must use POST');
        await chat.screenshot({path:out+'/agent-'+width+'x'+height+'.png'});
        console.log('AQUA_AGENT_UI_PASS='+width+'x'+height);
        assert.deepEqual(network,[],'Unexpected frontend JS error: '+network.join(' | '));
      }finally{await context.close()}
    }
    console.log('AQUA_AGENT_PRODUCTION_QA=PASS');
  }finally{await browser.close()}
})().catch(e=>{console.error('AQUA_AGENT_PRODUCTION_QA=FAIL '+String(e.stack||e));process.exitCode=1});
