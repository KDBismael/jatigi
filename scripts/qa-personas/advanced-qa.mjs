import fs from 'node:fs';
import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
process.loadEnvFile('.env');
const base=process.env.QA_BASE_URL||'http://localhost:3011', stamp=Date.now();
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const checks=[];let fixture;
const check=(name,ok,details={})=>{checks.push({name,ok,...details});console.log(JSON.stringify(checks.at(-1)))};
async function session(account){let cookies=[];const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>cookies,setAll:value=>{cookies=value}}});const result=await client.auth.signInWithPassword(account);if(result.error)throw Error('Connexion QA impossible');return {id:result.data.user.id,request:async(path,method='GET',body)=>{const response=await fetch(base+path,{method,redirect:'manual',headers:{Cookie:cookies.map(c=>`${c.name}=${c.value}`).join('; '),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=null}return {status:response.status,data,text}}};}
function account(label){return {email:`qa-advanced-${label}-${stamp}@example.com`,password:`Qa!${crypto.randomBytes(16).toString('hex')}9`}}
const ownerAccount=account('owner');const signup=await fetch(base+'/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...ownerAccount,full_name:'QA avancée propriétaire',phone:'0700000100',organization_name:`QA avancée ${stamp}`})});
if(signup.status!==201)throw Error('Inscription QA impossible');
const owner=await session(ownerAccount);const me=await owner.request('/api/me');const organizationId=me.data.profile.organization_id;
const org=await db.from('organizations').select('name').eq('id',organizationId).single();if(!org.data?.name.startsWith('QA avancée '))throw Error('Garde QA');
const grant=await db.from('subscription_grants').insert({organization_id:organizationId,plan:'business',period_start:new Date().toISOString(),period_end:new Date(Date.now()+3600000).toISOString()}).select('id').single();if(grant.error)throw Error('Fixture abonnement impossible');
fixture={owner:ownerAccount,organizationId,grantId:grant.data.id,createdAt:new Date().toISOString()};fs.writeFileSync('/private/tmp/warko-advanced-qa.json',JSON.stringify(fixture),{mode:0o600});
try{
 const otherAccount=JSON.parse(fs.readFileSync('/private/tmp/warko-qa-postsql-impatient.json','utf8'));const other=await session({email:otherAccount.email,password:otherAccount.password});
 const product=await owner.request('/api/products','POST',{name:'QA produit avancé',pricing_mode:'unit',sale_price:2000,stock_quantity:200,total_purchase:100000,total_transport:0,total_packaging:0});check('Produit réel QA',product.status===201,{status:product.status});fixture.productId=product.data?.id;
 const driver=await owner.request('/api/delivery-drivers','POST',{name:'QA avancé livreur',phone:'0700000101'});check('Livreur réel QA',driver.status===201,{status:driver.status});fixture.driverId=driver.data?.id;
 const members={};for(const role of ['employee','manager']){const credentials=account(role);const r=await owner.request('/api/team','POST',{...credentials,full_name:`QA ${role}`,role});check(`Créer ${role}`,r.status===201,{status:r.status});if(r.status===201){members[role]=await session(credentials);fixture[role]=credentials}}
 const orderInput={client_name:'QA commande avancée',client_phone:'0700000102',channel:'whatsapp',order_date:new Date().toISOString().slice(0,10),seller_id:owner.id,delivery_driver_id:fixture.driverId,delivery_date:new Date().toISOString().slice(0,10),delivery_fee:500,lines:[{product_id:fixture.productId,quantity:2}]};
 const order=await owner.request('/api/orders','POST',orderInput);check('Commande réelle QA',order.status===201,{status:order.status,error:order.status===201?undefined:order.data?.error});fixture.orderId=order.data?.id;
 for(const [role,member]of Object.entries(members)){
  for(const path of ['/api/expenses','/api/goals','/api/lives','/api/analytics','/api/team']){const r=await member.request(path);check(`${role} refuse ${path}`,[401,403].includes(r.status),{status:r.status})}
  const products=await member.request('/api/products');check(`${role} produits protégés`,role==='manager'?[401,403].includes(products.status):products.status===200&&!JSON.stringify(products.data).includes('purchase_cost'),{status:products.status});
  const orders=await member.request('/api/orders');check(`${role} accès commandes`,orders.status===200,{status:orders.status});if(orders.status===200)check(`${role} coûts masqués`,!JSON.stringify(orders.data).includes('unit_cost'));
  if(fixture.orderId){const status=await member.request(`/api/orders/${fixture.orderId}`,'PATCH',{status:'confirmed'});check(`${role} statut confirmé`,role==='manager'?status.status===403:status.status===200,{status:status.status})}
 }
 if(fixture.orderId){const r=await other.request(`/api/orders/${fixture.orderId}`);check('Autre boutique refuse commande',r.status===404,{status:r.status});}
 const date=new Date().toISOString().slice(0,10),month=date.slice(0,7)+'-01';
 const live=await owner.request('/api/lives','POST',{name:'QA live avancé',session_date:date,slot:'evening',target_amount:20000,status:'planned'});check('Créer session live',live.status===201,{status:live.status});fixture.liveId=live.data?.id;
 const lives=await owner.request('/api/lives');check('Relire session live',lives.status===200&&lives.data.some(l=>l.id===fixture.liveId));
 const expense=await owner.request('/api/expenses','POST',{category:'internet',label:'QA internet avancée',amount:1500,expense_date:date,recurring:false});check('Créer dépense réelle',expense.status===201,{status:expense.status});fixture.expenseId=expense.data?.id;
 // The expenses listing invokes global recurring maintenance; avoid triggering other shops during QA.
 const ownExpense=await db.from('expenses').select('id,amount').eq('organization_id',organizationId).eq('id',fixture.expenseId).single();check('Dépense persistée dans boutique QA',ownExpense.data?.amount===1500);
 const globalGoal=await owner.request('/api/goals','POST',{month,scope:'global',amount:30000});check('Créer objectif global',globalGoal.status===200||globalGoal.status===201,{status:globalGoal.status});
 const ownGoals=await owner.request('/api/goals?month='+month);check('Relire objectif global',ownGoals.status===200&&ownGoals.data.some(g=>Number(g.amount)===30000));
 if(fixture.liveId){const crossGoal=await other.request('/api/goals','POST',{month,scope:'live',live_session_id:fixture.liveId,amount:12345});check('Refuse objectif sur live autre boutique',[400,403,404].includes(crossGoal.status),{status:crossGoal.status});fixture.crossGoalId=crossGoal.status===201||crossGoal.status===200?crossGoal.data?.id:null;}
 const billing=await owner.request('/api/billing');check('Fixture Business active',billing.data?.plan==='business');
 fs.writeFileSync('/private/tmp/warko-advanced-qa.json',JSON.stringify(fixture),{mode:0o600});
}catch(error){check('Exécution complète',false,{error:error.message});}
fs.writeFileSync('/private/tmp/warko-advanced-qa.json',JSON.stringify(fixture),{mode:0o600});
fs.writeFileSync('docs/reports/launch-qa/advanced-qa.json',JSON.stringify({checkedAt:new Date().toISOString(),scope:'Données QA isolées, droit Business temporaire sans paiement, aucun email ni cron déclenché.',checks},null,2));
console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.ok).length}));
