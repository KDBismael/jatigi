import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import readline from 'node:readline';
const require=createRequire('/Users/MACPRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
const page=await context.newPage();
const cdp=await context.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:64000,uploadThroughput:32000});
const errors=[];
page.on('response',r=>{if(r.status()>=400)errors.push({url:r.url().split('?')[0],status:r.status()});});
const start=Date.now();
await page.goto('http://localhost:3011',{waitUntil:'domcontentloaded'});
console.log(JSON.stringify({ready:true,ms:Date.now()-start,text:(await page.locator('body').innerText()).slice(0,600)}));
for await(const command of readline.createInterface({input:process.stdin,terminal:false})){
 if(command==='close')break;
 try{
  const began=Date.now();
  await (new Function('page','fs','return (async()=>{'+JSON.parse(command)+'})()'))(page,fs);
  console.log(JSON.stringify({ms:Date.now()-began,url:page.url(),text:(await page.locator('body').innerText()).slice(0,6500),errors}));
 }catch(e){console.log(JSON.stringify({error:e.message}));}
}
await context.close();
await browser.close();
