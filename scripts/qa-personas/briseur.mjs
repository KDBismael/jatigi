import { chromium } from '/Users/MACPRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
import readline from 'node:readline';
// Interactive visible UI harness. Feed one JavaScript statement per line; no API bypass.
// QA_PHASE=after QA_REUSE=1 reuses the disposable account without another signup.
const out = `artifacts/launch-qa/${process.env.QA_PHASE || 'after'}/briseur`;
await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-first-run']});
const context = await browser.newContext({viewport:{width:1280,height:900},...(process.env.QA_REUSE ? {storageState:'/private/tmp/warko-qa-briseur-state.json'} : {})});
const page = await context.newPage();
const requests=[];
page.on('request', r=> {if(r.method()==='POST') requests.push({url:r.url(),method:r.method(),at:new Date().toISOString()});});
page.on('response', async r=> {if(r.request().method()==='POST'){const row=requests.findLast(x=>x.url===r.url()&&!x.status); if(row)row.status=r.status(); await fs.writeFile(`${out}/post-requests.json`,JSON.stringify(requests,null,2));}});
const shot=async name=>page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:80,fullPage:true});
const inspect=async()=>console.log(JSON.stringify({url:page.url(),text:(await page.locator('body').innerText()).slice(0,5500),inputs:await page.locator('input').evaluateAll(xs=>xs.map(x=>({type:x.type,name:x.name,placeholder:x.placeholder,id:x.id}))) }));
await page.goto('http://localhost:3011');
await shot('01-home'); await inspect();
const commands=readline.createInterface({input:process.stdin});
for await (const command of commands){try{await eval(`(async()=>{${command}})()`);}catch(e){console.log('COMMAND_ERROR',e.message);}}
await browser.close();
