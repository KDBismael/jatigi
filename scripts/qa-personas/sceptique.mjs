import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/MACPRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
const p=await ctx.newPage();
const failures=[];
p.on('response',r=>{if(r.status()>=400)failures.push({status:r.status(),url:r.url().split('?')[0]});});
try {
 await p.goto('http://localhost:3011',{waitUntil:'networkidle'});
 const faqs=['Le plan Découverte est-il vraiment gratuit ?','Que se passe-t-il quand j’atteins 100 commandes dans le mois ?','Comment payer mon abonnement ?','Et si un paiement de renouvellement échoue ?','Puis-je changer de plan ou annuler ?'];
 const answers=[];
 for(const q of faqs){await p.getByRole('button',{name:q,exact:true}).click();answers.push({question:q,text:await p.locator('#faq').innerText()});}
 await fs.writeFile('/private/tmp/warko-qa-sceptique-faq.json',JSON.stringify(answers));
 await p.getByRole('button',{name:/Annuel/}).click();
 await fs.writeFile('/private/tmp/warko-qa-sceptique-pricing.txt',await p.locator('#tarifs').innerText());
 await p.locator('#tarifs').scrollIntoViewIfNeeded();
 await p.screenshot({path:'artifacts/launch-qa/before/sceptique/01-annual-pricing.jpg',type:'jpeg',quality:60});
 await p.locator('footer').scrollIntoViewIfNeeded();
 await p.screenshot({path:'artifacts/launch-qa/before/sceptique/02-footer-no-legal-contact.jpg',type:'jpeg',quality:60});
 await p.locator('a[href="/auth/signup?plan=pro"]').click();
 await p.waitForURL('**/auth/signup?plan=pro');
 await p.getByRole('button',{name:'Créer ma boutique',exact:true}).last().waitFor();
 console.log(JSON.stringify({url:p.url(),signup:await p.locator('body').innerText(),inputs:await p.locator('input').evaluateAll(a=>a.map(x=>({type:x.type,name:x.name,placeholder:x.placeholder}))),links:await p.getByRole('link').evaluateAll(a=>a.map(x=>({text:x.innerText,url:x.getAttribute('href')})))}));
 await p.screenshot({path:'artifacts/launch-qa/before/sceptique/03-signup-no-period-legal.jpg',type:'jpeg',quality:60});
 let credentials;
 try{credentials=JSON.parse(await fs.readFile('/private/tmp/warko-qa-sceptique.json','utf8'));}catch{credentials={email:`qa-warko-sceptique-${Date.now()}@example.com`,password:`QA!Sceptique${crypto.randomUUID()}9`,shop:'QA lancement sceptique'};await fs.writeFile('/private/tmp/warko-qa-sceptique.json',JSON.stringify(credentials),{mode:0o600});}
 if(process.argv.includes('--follow')){
 await p.getByRole('link',{name:'Se connecter',exact:true}).click();
 await p.waitForURL('**/auth/login?plan=pro');
 await p.locator('input[name="email"]').fill(credentials.email);
 console.log(JSON.stringify({login:await p.locator('body').innerText()}));
 if(await p.getByRole('button',{name:'Continuer',exact:true}).count())await p.getByRole('button',{name:'Continuer',exact:true}).click();
 await p.locator('input[type="password"]').fill(credentials.password);
 await p.getByRole('button',{name:'Se connecter',exact:true}).click();
 }else{
 await p.locator('input[name="organization_name"]').fill(credentials.shop);
 await p.locator('input[name="full_name"]').fill('QA Sceptique');
 await p.locator('input[name="phone"]').fill('0700000012');
 await p.locator('input[name="email"]').fill(credentials.email);
 await p.locator('input[name="password"]').fill(credentials.password);
 await p.locator('input[name="confirmPassword"]').fill(credentials.password);
 await p.getByRole('button',{name:'Créer ma boutique',exact:true}).last().click();
 }
 await p.waitForTimeout(5000);
 if(process.argv.includes('--follow')){await p.goto('http://localhost:3011/onboarding',{waitUntil:'networkidle'});}
 console.log(JSON.stringify({afterSubmitUrl:p.url(),text:(await p.locator('body').innerText()).replaceAll(credentials.email,'[QA email]'),failures}));
 await p.screenshot({path:'artifacts/launch-qa/before/sceptique/04-signup-result.jpg',type:'jpeg',quality:60});
 if(await p.getByRole('button',{name:'Réessayer',exact:true}).count()){await p.getByRole('button',{name:'Réessayer',exact:true}).click();await p.waitForTimeout(1500);console.log(JSON.stringify({retry:await p.locator('main').innerText()}));}
 await p.getByRole('link',{name:'Produits',exact:true}).click();await p.waitForTimeout(1500);
 console.log(JSON.stringify({productsUrl:p.url(),products:await p.locator('body').innerText()}));
 await p.screenshot({path:'artifacts/launch-qa/before/sceptique/05-products.jpg',type:'jpeg',quality:60});
 if(process.argv.includes('--product')){await p.getByRole('button',{name:/Ajouter un produit/}).click();await p.waitForTimeout(1000);console.log(JSON.stringify({productForm:await p.locator('body').innerText(),fields:await p.locator('input').evaluateAll(a=>a.map(x=>({type:x.type,name:x.name,placeholder:x.placeholder})))}));}
 await p.getByRole('link',{name:'Abonnement',exact:true}).click();await p.waitForTimeout(1500);
 console.log(JSON.stringify({billingUrl:p.url(),billing:await p.locator('body').innerText(),failures}));
 await p.screenshot({path:'artifacts/launch-qa/before/sceptique/06-billing.jpg',type:'jpeg',quality:60});
 await p.getByRole('link',{name:'Support',exact:true}).click();await p.waitForTimeout(1000);
 console.log(JSON.stringify({supportUrl:p.url(),support:await p.locator('body').innerText()}));
 await p.screenshot({path:'artifacts/launch-qa/before/sceptique/07-support.jpg',type:'jpeg',quality:60});
} finally {await ctx.close();await browser.close();}
