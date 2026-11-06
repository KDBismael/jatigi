// Visual QA only: use the isolated fixture file, never a real merchant account.
import fs from 'node:fs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const fixture=JSON.parse(fs.readFileSync(process.env.WARKO_QA_FIXTURE||'/private/tmp/warko-mobile-private.json','utf8'));
if(!fixture.me.organization.name.startsWith('QA mobile UI '))throw Error('A dedicated mobile QA shop is required');
const phase=process.env.QA_PHASE||'before',out=`artifacts/launch-qa/mobile-ui/${phase}`;fs.mkdirSync(out,{recursive:true});
const engine=process.env.QA_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true,...(process.env.CHROME_EXECUTABLE&&engine===chromium?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
const results=[];const errors=[];
const paths=['/onboarding','/products/new','/products',`/products/${fixture.productId}`,'/orders/new','/orders',`/orders/${fixture.orderId}`,'/dashboard','/deliveries','/analytics','/expenses','/pilotage','/reports','/team','/account','/more','/subscription','/support'];
const auxiliary=process.env.QA_AUX||'';
const extended=process.env.QA_EXTENDED==='1';
const extendedPaths=['/products','/products/new',`/products/${fixture.productId}`,'/orders/new','/orders',`/orders/${fixture.orderId}`,'/dashboard','/deliveries','/analytics','/expenses','/pilotage','/pilotage/11111111-1111-4111-8111-111111111111','/reports','/team','/account','/more','/subscription'];
const auxiliaryPaths=auxiliary==='auth'?['/auth/login','/auth/signup','/auth/forgot-password','/auth/reset-password']:auxiliary==='print'?['a4','58mm','80mm'].map(f=>`/orders/${fixture.orderId}/print?format=${f}`):auxiliary==='employee'?['/orders','/orders/new',`/orders/${fixture.orderId}`,'/more','/account','/support']:auxiliary==='manager'?['/deliveries','/orders',`/orders/${fixture.orderId}`,'/more','/account','/support']:[];
const apiCache=new Map();
const widths=(process.env.QA_WIDTHS||'375,390,768').split(',').map(Number),themes=(process.env.QA_THEMES||'light,dark').split(',');
async function inspect(page,name,width,theme){
 const findings=await page.evaluate(()=>{
  const intentional=e=>{for(let p=e;p&&p!==document.body;p=p.parentElement){if(/overflow-x-(auto|scroll)/.test(p.className||''))return true}return false};
  const seen=new Set(),issues=[];
  function add(kind,e,rect){const text=(e.innerText||e.getAttribute('aria-label')||e.getAttribute('name')||e.tagName).replace(/\s+/g,' ').slice(0,100);const key=kind+text;if(!seen.has(key)){seen.add(key);issues.push({kind,tag:e.tagName,text,x:Math.round(rect.x),right:Math.round(rect.right),width:Math.round(rect.width)})}}
  for(const e of document.querySelectorAll('main div,main span,main p,main strong,main dd,main h1,main h2,main h3,main label,main button,main input,main select,[role="dialog"] p,[role="dialog"] input')){
   const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(!r.width||!r.height||cs.visibility==='hidden'||e.classList.contains('sr-only')||intentional(e))continue;
   if(r.left< -1||r.right>innerWidth+1)add('outside-viewport',e,r);
   if(cs.textOverflow!=='ellipsis'&&e.childNodes.length&&(['P','STRONG','DD','H1','H2','H3','LABEL','BUTTON'].includes(e.tagName)||(['DIV','SPAN'].includes(e.tagName)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())))){
    const range=document.createRange();range.selectNodeContents(e);const tr=range.getBoundingClientRect();if(tr.width&&(tr.right>r.right+2||tr.left<r.left-2))add('text-overflow',e,tr)
   }
  }
  return issues;
 });
 const title=await page.title();await page.screenshot({path:`${out}/${width}-${theme}-${name.replace(/[^a-zA-Z0-9_-]/g,'_')}.png`,fullPage:true});
 results.push({name,width,theme,url:new URL(page.url()).pathname,title,findings});console.log(JSON.stringify({name,width,theme,issues:findings.length}));
}
try{
 for(const width of widths)for(const theme of themes){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});if(auxiliary!=='auth')await context.addCookies(fixture.cookies);
  await context.addInitScript(t=>localStorage.setItem('warko-theme',t),theme);
  if(extended)await context.route('**/api/**',async route=>{
   if(route.request().method()!=='GET')return route.fulfill({status:204,body:''});
   const path=new URL(route.request().url()).pathname;
   const live={id:'11111111-1111-4111-8111-111111111111',organization_id:fixture.me.organization.id,name:'Présentation des nouvelles collections avec un nom de session très long',session_date:'2026-11-06',slot:'evening',target_amount:99999999,status:'active',created_at:'2026-11-06T00:00:00Z'};
   if(path==='/api/lives')return route.fulfill({json:[live]});
   if(path==='/api/goals')return route.fulfill({json:[{id:'goal',scope:'global',month:'2026-11-01',amount:99999999}]});
   if(path==='/api/delivery-balance')return route.fulfill({json:{date:'2026-11-06',undatedOrders:0,drivers:[{driverId:fixture.driverId,driverName:'QA Livreur avec un nom particulièrement long',isActive:true,counts:{delivered:12,in_progress:2,cancelled:1,postponed:3},amountCollected:99999999,deliveryFees:99999999,remittedOnDate:99999999,globalAmountDue:99999999,expectedRemittance:99999999,orders:[{assignmentId:'assignment',orderId:fixture.orderId,clientName:'QA Cliente avec un nom particulièrement long',clientPhone:'0700000125',products:'Parfum collection Premium avec un nom particulièrement long',status:'delivered',remittableAmount:99999999}]}]}});
   const key=route.request().url();let result=apiCache.get(key);if(!result){const response=await route.fetch();let data;try{data=await response.json()}catch{return route.fulfill({response})};result={data,status:response.status()};apiCache.set(key,result)}
   const money=/amount|cost|price|revenue|profit|expense|remit|fee|margin|collected|due|turnover|cogs/i;
   const stress=(v,k='')=>typeof v==='number'&&money.test(k)?99999999:Array.isArray(v)?v.map(x=>stress(x)):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([key,x])=>[key,stress(x,key)])):v;
   return route.fulfill({status:result.status,json:stress(result.data)});
  });
  await context.route('**/api/onboarding',route=>route.request().method()==='GET'?route.fulfill({json:{completed:{product:false,driver:false,order:false},complete:false,step:1,skipped_steps:[],should_start:false}}):route.abort());
  // Treat UI-only billing as Business without creating paid entitlements or a checkout.
  await context.route('**/api/billing',async route=>{const response=await route.fetch();const data=await response.json();await route.fulfill({json:{...data,plan:'business',cycle:'monthly',status:'active',limits:{orders:null,drivers:null,users:null},periodEnd:'2026-12-06T00:00:00Z'}})});
  if(auxiliary==='employee'||auxiliary==='manager')await context.route('**/api/me',route=>route.fulfill({json:{...fixture.me,profile:{...fixture.me.profile,role:auxiliary}}}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push({width,theme,error:e.message}));page.on('console',m=>{if(m.type()==='error'&&/hydrat|didn't match/.test(m.text()))errors.push({width,theme,error:m.text().slice(0,150)})});
  for(const path of process.env.QA_PATHS?process.env.QA_PATHS.split(','):auxiliaryPaths.length?auxiliaryPaths:extended?extendedPaths:paths){
   try{
    await page.goto(fixture.base+path,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForLoadState('networkidle',{timeout:10000}).catch(()=>{});await page.waitForTimeout(300);
    if(path==='/onboarding'||path==='/products/new'){
     for(const [label,value]of [['Quantité reçue','100'],['Montant payé au fournisseur (FCFA)','50000'],['Frais de transport (FCFA)','5000'],['Total emballage (FCFA)','1000'],['Prix de vente unitaire (FCFA)','5000']])await page.getByLabel(label,{exact:true}).fill(value);
    }
    if(auxiliary==='auth'){
     const email=page.locator('input[type="email"]').first();if(await email.count())await email.fill('email-invalide');
     for(const password of await page.locator('input[type="password"]').all())await password.fill('abc');
     const submit=page.locator('form button[type="submit"]').first();if(await submit.count())await submit.click();
    }
    if(extended&&path==='/orders/new'){
     const product=page.locator('select[name="lines.0.product_id"]');if(await product.count()){await product.selectOption(fixture.productId);await page.locator('input[name="lines.0.quantity"]').fill('3')}
    }
    await inspect(page,path,width,theme);
    if(auxiliary==='print'){
     await page.getByRole('button',{name:'Imprimer',exact:true}).click();await inspect(page,path+'-printer-picker',width,theme);await page.getByRole('button',{name:'Fermer le sélecteur d’imprimante',exact:true}).click();
    }
    if(extended&&path==='/team')for(const name of ['+ Personne commerciale','+ Compte utilisateur']){await page.getByRole('button',{name,exact:true}).click();await inspect(page,'team-form-'+name,width,theme);await page.getByRole('button',{name:'Annuler',exact:true}).first().click()}
    if(extended&&path==='/deliveries'){
     await page.getByRole('button',{name:'+ Ajouter un livreur',exact:true}).click();await inspect(page,'driver-form',width,theme);
     await page.getByRole('button',{name:'Suivi global et versements',exact:true}).click();await inspect(page,'delivery-global',width,theme);
     const settle=page.getByRole('button',{name:'Enregistrer un versement',exact:true}).first();if(await settle.count()){await settle.click();await inspect(page,'settlement-form',width,theme)}
    }

    if(path===`/products/${fixture.productId}`){
     await page.getByRole('button',{name:'+ Stock',exact:true}).click();await page.getByLabel('Quantité reçue',{exact:true}).fill('100');await page.getByLabel('Montant payé au fournisseur (FCFA)',{exact:true}).fill('50000');await inspect(page,'stock-modal',width,theme);await page.getByRole('button',{name:'Annuler',exact:true}).last().click();
    }
   }catch(e){errors.push({path,width,theme,error:e.message.slice(0,230)});console.log(JSON.stringify({path,width,theme,error:e.message.slice(0,120)}))}
  }
  await context.close();
 }
}finally{await browser.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify({results,errors},null,2))}
console.log(JSON.stringify({screens:results.length,issues:results.reduce((n,r)=>n+r.findings.length,0),errors:errors.length}));
if(process.env.QA_ASSERT==='1'&&(results.some(r=>r.findings.length)||errors.length))process.exitCode=1;
