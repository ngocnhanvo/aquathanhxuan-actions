import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const ORIGIN = 'https://aquathanhxuan.io.vn';
await mkdir('artifacts/pagespeed-image-network', { recursive: true });
const browser = await chromium.launch({headless:true, executablePath:'/usr/bin/google-chrome', args:['--no-sandbox','--disable-dev-shm-usage']});
const reports=[];
const assetUrls=new Set([ORIGIN+'/tool/avatar-agent.webp']);
for(const device of ['desktop','mobile']){
 for(let pass=1;pass<=2;pass++){
  const context=await browser.newContext({viewport:device==='mobile'?{width:390,height:844}:{width:1440,height:900},isMobile:device==='mobile',deviceScaleFactor:1});
  const page=await context.newPage();
  const failed=[],responses=[],consoleErrors=[];
  page.on('requestfailed',req=>{if(req.url().startsWith(ORIGIN))failed.push({url:req.url(),type:req.resourceType(),error:req.failure()?.errorText});});
  page.on('response',res=>{if(res.url().startsWith(ORIGIN)&&res.status()>=400)responses.push({url:res.url(),status:res.status()});});
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text().slice(0,250));});
  let navError=null,status=null;
  try{
   const nav=await page.goto(ORIGIN+'/?network_qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});status=nav?.status();
   const initial = await page.evaluate(() => Array.from(document.images).map((img,i)=>({i,src:img.currentSrc||img.src,loading:img.loading,fetchPriority:img.fetchPriority,top:Math.round(img.getBoundingClientRect().top),complete:img.complete,naturalWidth:img.naturalWidth,section:img.closest('section')?.getAttribute('data-esc-source-table')||img.closest('section')?.getAttribute('data-aqua-home-sale')||'',visible:img.getBoundingClientRect().bottom>0&&img.getBoundingClientRect().top<innerHeight})));console.log('INITIAL_IMAGES '+JSON.stringify({device,pass,images:initial}));
   const pageHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
   const step=device==='mobile'?650:800;
   for(let y=0;y<Math.min(pageHeight,8000);y+=step){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(160);}
   await page.waitForTimeout(4000);
   for(const u of await page.evaluate(()=>Array.from(document.images).flatMap(img=>[img.src,img.currentSrc,...(img.srcset||'').split(',').map(x=>x.trim().split(' ')[0])]).filter(Boolean))){if(u.startsWith(ORIGIN+'/images/pages/'))assetUrls.add(u);}
  }catch(e){navError=String(e);}
  const report={device,pass,status,navError,failed,errors:responses,consoleErrors:consoleErrors.slice(0,30),assetsCollected:assetUrls.size};
  reports.push(report);console.log('BROWSER_RESULT '+JSON.stringify(report));
  await context.close();
 }
}
await browser.close();
const urls=[...assetUrls].filter(x=>/\.webp(?:$|\?)/i.test(x)).slice(0,14);
console.log('ASSETS_TO_PROBE '+JSON.stringify(urls));
const checks=[];
for(let round=1;round<=3;round++){
 for(let i=0;i<urls.length;i+=5){
  const batch=await Promise.all(urls.slice(i,i+5).map(async url=>{
   try{
    const {stdout}=await execFileAsync('curl',['-L','-sS','--http1.1','--connect-timeout','7','--max-time','20','--retry','0','-o','/dev/null','-w','%{http_code} %{time_namelookup} %{time_connect} %{time_starttransfer} %{time_total} %{remote_ip} %{size_download}',url],{timeout:22000});
    const [code,dns,connect,ttfb,total,ip,size]=stdout.trim().split(/\s+/);
    return {round,url,code:Number(code),dns:Number(dns),connect:Number(connect),ttfb:Number(ttfb),total:Number(total),ip,bytes:Number(size)};
   }catch(e){return {round,url,error:String(e.stderr||e.message).slice(0,300),exitCode:e.code};}
  }));
  checks.push(...batch);
 }
}
for(const c of checks)console.log('ASSET_PROBE '+JSON.stringify(c));
const summary={at:new Date().toISOString(),origin:ORIGIN,numberOfAssets:urls.length,browserFailures:reports.flatMap(x=>x.failed),browserHttpErrors:reports.flatMap(x=>x.errors),probes:checks,failCount:checks.filter(x=>x.error||x.code!==200).length};
console.log('FINAL_NETWORK_SUMMARY '+JSON.stringify({browserFailures:summary.browserFailures.length,browserHttpErrors:summary.browserHttpErrors.length,probeFailures:summary.failCount,probeCount:checks.length,non200:checks.filter(x=>x.error||x.code!==200)}));
await writeFile('artifacts/pagespeed-image-network/report.json',JSON.stringify({runs:reports,...summary},null,2)+'\n');