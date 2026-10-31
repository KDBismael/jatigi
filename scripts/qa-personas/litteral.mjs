import { chromium } from '/Users/MACPRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
import readline from 'node:readline';
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--window-position=80,80']});
const context = await browser.newContext({viewport:{width:1280,height:900}});
const page = await context.newPage();
const stamp=Date.now();
const creds={email:`qa-warko-litteral-${stamp}@example.com`,password:`Litteral!Qa${stamp}Z`,name:'QA lancement littéral'};
await fs.writeFile('/private/tmp/warko-qa-litteral.json',JSON.stringify(creds),{mode:0o600});
async function state(){console.log('URL '+page.url());console.log((await page.locator('body').innerText()).slice(0,13000));}
await page.goto('http://localhost:3011');await state();
console.log('READY');
const rl=readline.createInterface({input:process.stdin});
for await(const line of rl){try{await eval(`(async()=>{${line}})()`);}catch(e){console.log('ERROR '+e.message)}}
await browser.close();
