import { createRequire } from 'node:module';
import readline from 'node:readline';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/MACPRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context = await browser.newContext({viewport:{width:1280,height:900}});
const p = await context.newPage();
const account={email:`qa-warko-impatient-after-${Date.now()}@example.com`,password:`Qa!Warko${Date.now()}Strong`};
fs.writeFileSync('/private/tmp/warko-qa-impatient-after.json',JSON.stringify(account),{mode:0o600});
await p.goto('http://localhost:3011');
console.log(JSON.stringify({url:p.url(),body:await p.locator('body').innerText()}));
const rl=readline.createInterface({input:process.stdin});
for await (const line of rl) {
 try { const result=await eval(`(async()=>{${line}})()`);console.log(JSON.stringify(result??{ok:true})); } catch(e){console.log(JSON.stringify({error:e.message}));}
}
await context.close();await browser.close();
