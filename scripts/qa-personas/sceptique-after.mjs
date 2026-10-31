import {createRequire} from 'node:module'
import fs from 'node:fs/promises'
const require=createRequire(import.meta.url)
const {chromium}=require('/Users/MACPRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core')
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const ctx=await browser.newContext({viewport:{width:1280,height:900}})
const p=await ctx.newPage()
const failures=[]
p.on('response',r=>{if(r.status()>=400)failures.push({status:r.status(),url:r.url().split('?')[0]})})
const shot=name=>p.screenshot({path:`artifacts/launch-qa/after/sceptique/${name}.jpg`,type:'jpeg',quality:60})
try{
 await p.goto('http://localhost:3011',{waitUntil:'networkidle'})
 for(const label of ['Conditions','Confidentialité','Contact']){
  await p.locator('footer').getByRole('link',{name:label,exact:true}).click()
  await p.waitForURL(`**/${label==='Conditions'?'conditions':label==='Contact'?'contact':'confidentialite'}`);await p.getByRole('heading',{level:1}).waitFor()
  console.log(JSON.stringify({publicPage:label,url:p.url(),heading:await p.getByRole('heading',{level:1}).innerText(),email:await p.getByRole('link',{name:'support@warko.app',exact:true}).count()}))
  await shot(`01-${label==='Conditions'?'conditions':label==='Contact'?'contact':'confidentialite'}`)
  await p.getByRole('link',{name:'Retour à l’accueil',exact:true}).click();await p.locator('footer').waitFor()
 }
 await p.getByRole('button',{name:/Annuel/}).click()
 console.log(JSON.stringify({annualPrice:await p.getByTestId('pricing-price-pro').innerText(),cta:await p.getByTestId('pricing-cta-pro').getAttribute('href')}))
 await p.getByTestId('pricing-cta-pro').click();await p.waitForURL('**/auth/signup?plan=pro&cycle=yearly');await p.getByTestId('signup-selected-plan').waitFor()
 console.log(JSON.stringify({signupIntent:await p.getByTestId('signup-selected-plan').innerText()}))
 await shot('02-signup-annual-intent')
 for(const label of ['Conditions','Confidentialité','Contact']){
  const link=p.getByRole('link',{name:label,exact:true});console.log(JSON.stringify({authLink:label,href:await link.getAttribute('href')}))
  await link.click();await p.waitForURL(`**/${label==='Conditions'?'conditions':label==='Contact'?'contact':'confidentialite'}`);await p.getByRole('heading',{level:1}).waitFor();console.log(JSON.stringify({authLegalReachable:label,url:p.url()}));await p.goBack();await p.getByTestId('signup-selected-plan').waitFor()
 }
 await p.getByTestId('auth-tab-login').click();await p.waitForURL('**/auth/login?plan=pro&cycle=yearly');await p.getByTestId('login-submit').waitFor()
 console.log(JSON.stringify({loginUrl:p.url(),loginText:await p.locator('form').innerText()}));await shot('03-login-annual-intent')
 await p.getByTestId('auth-tab-signup').click();await p.waitForURL('**/auth/signup?plan=pro&cycle=yearly');await p.getByTestId('signup-submit').waitFor()
 let credentials={email:`qa-warko-sceptique-after-${Date.now()}@example.com`,password:`QA!Sceptique${crypto.randomUUID()}9`,shop:'QA lancement sceptique après'}
 if(process.argv.includes('--follow')){
 credentials=JSON.parse(await fs.readFile('/private/tmp/warko-qa-sceptique-after.json','utf8'));
 await p.getByTestId('auth-tab-login').click();await p.waitForURL('**/auth/login?plan=pro&cycle=yearly');
 await p.getByTestId('login-email').fill(credentials.email);await p.getByTestId('login-password').fill(credentials.password);await p.getByTestId('login-submit').click();await p.waitForURL(/\/(dashboard|onboarding)/);await p.goto('http://localhost:3011/onboarding');
 }else{
 await fs.writeFile('/private/tmp/warko-qa-sceptique-after.json',JSON.stringify(credentials),{mode:0o600})
 for(const [name,value] of [['organization_name',credentials.shop],['full_name','QA Sceptique Après'],['phone','0700000013'],['email',credentials.email],['password',credentials.password],['confirmPassword',credentials.password]]) await p.locator(`input[name="${name}"]`).fill(value)
 await p.getByTestId('signup-submit').click();await p.waitForURL('**/onboarding');}
 await p.getByRole('button',{name:'Réessayer',exact:true}).waitFor({timeout:25000}).catch(()=>{});await p.waitForTimeout(1000)
 console.log(JSON.stringify({signupResultUrl:p.url(),text:(await p.locator('body').innerText()).replaceAll(credentials.email,'[QA email]'),failures}))
 await shot('04-onboarding-blocker')
 if(await p.getByRole('button',{name:'Réessayer',exact:true}).count()){await p.getByRole('button',{name:'Réessayer',exact:true}).click();await p.waitForTimeout(1500);console.log(JSON.stringify({retry:await p.locator('main').last().innerText()}))}
 await p.getByRole('link',{name:'Abonnement',exact:true}).click();await p.waitForTimeout(1500)
 console.log(JSON.stringify({billingUrl:p.url(),billing:await p.locator('main').last().innerText()}));await shot('05-billing-blocker')
 await p.getByRole('link',{name:'Support',exact:true}).click();await p.waitForTimeout(800)
 console.log(JSON.stringify({supportUrl:p.url(),support:await p.locator('main').last().innerText(),failures}));await shot('06-support')
}finally{await ctx.close();await browser.close()}
