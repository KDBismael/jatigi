import fs from 'node:fs';import {createClient}from'@supabase/supabase-js';import{createServerClient}from'@supabase/ssr';
process.loadEnvFile('.env');const base='http://localhost:3011',f=JSON.parse(fs.readFileSync('/private/tmp/warko-advanced-qa.json','utf8'));const checks=[];const check=(name,ok,details={})=>{checks.push({name,ok,...details});console.log(JSON.stringify(checks.at(-1)))};
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const org=await db.from('organizations').select('name').eq('id',f.organizationId).single();if(!org.data?.name.startsWith('QA avancée '))throw Error('QA only');
async function session(account){let cookies=[];const c=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>cookies,setAll:value=>{cookies=value}}});const login=await c.auth.signInWithPassword(account);if(login.error)throw Error('QA auth failed');return {id:login.data.user.id,request:async(path,method='GET',body)=>{const r=await fetch(base+path,{method,redirect:'manual',headers:{Cookie:cookies.map(c=>`${c.name}=${c.value}`).join('; '),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=null}return {status:r.status,data}}}}
const owner=await session(f.owner),employee=await session(f.employee),manager=await session(f.manager),b=JSON.parse(fs.readFileSync('/private/tmp/warko-qa-postsql-impatient.json','utf8')),other=await session({email:b.email,password:b.password});const date=new Date().toISOString().slice(0,10),month=date.slice(0,7)+'-01';
try{
 const cross=await other.request('/api/goals','POST',{month,scope:'live',live_session_id:f.liveId,amount:12345});check('Objectif cross-boutique refusé après correctif',cross.status===400,{status:cross.status});
 const ownGoal=await owner.request('/api/goals','POST',{month,scope:'live',live_session_id:f.liveId,amount:20000});check('Objectif live propre autorisé',ownGoal.status===201,{status:ownGoal.status});
 const employeeOrder=await employee.request('/api/orders','POST',{client_name:'QA commande employé',client_phone:'0700000103',channel:'whatsapp',order_date:date,seller_id:employee.id,delivery_driver_id:f.driverId,delivery_date:date,delivery_fee:500,lines:[{product_id:f.productId,quantity:1}]});check('Employé crée commande sans coûts exposés',employeeOrder.status===201&&!JSON.stringify(employeeOrder.data).includes('unit_cost'),{status:employeeOrder.status});
 let r=await owner.request(`/api/orders/${f.orderId}`,'PATCH',{status:'in_progress'});check('Admin confie commande en livraison',r.status===200,{status:r.status});
 r=await manager.request(`/api/orders/${f.orderId}`);check('Responsable lit commande en livraison sans coûts',r.status===200&&!JSON.stringify(r.data).includes('unit_cost'),{status:r.status});
 r=await manager.request(`/api/orders/${f.orderId}`,'PUT',{client_name:'Modification interdite'});check('Responsable ne modifie pas les champs généraux',r.status===403,{status:r.status});
 r=await manager.request(`/api/orders/${f.orderId}/discounts`,'PATCH',{lines:[]});check('Responsable ne modifie pas les remises',r.status===403,{status:r.status});
 r=await manager.request(`/api/orders/${f.orderId}`,'PATCH',{status:'delivered'});check('Responsable livre la commande',r.status===200,{status:r.status});
 r=await manager.request('/api/delivery-balance?date='+date);check('Responsable accède au bilan journalier Business QA',r.status===200,{status:r.status});
 const live={id:f.liveId,name:'QA live avancé',session_date:date,slot:'evening',target_amount:20000};
 r=await owner.request('/api/lives','PUT',{...live,status:'active'});check('Démarrer session live',r.status===200&&Boolean(r.data.started_at),{status:r.status});
 r=await owner.request('/api/lives','PUT',{...live,status:'completed'});check('Clôturer session live',r.status===200&&Boolean(r.data.closed_at),{status:r.status});
 r=await owner.request('/api/lives','PUT',{...live,status:'active'});check('Session clôturée verrouillée',r.status===409,{status:r.status});
 r=await other.request('/api/lives','PUT',{...live,status:'active'});check('Autre boutique ne modifie pas le live',r.status===404,{status:r.status});
 const expense={id:f.expenseId,category:'internet',label:'QA internet avancée',amount:2000,expense_date:date,recurring:false};
 r=await owner.request('/api/expenses','PUT',expense);check('Modifier sa dépense',r.status===200&&Number(r.data.amount)===2000,{status:r.status});
 r=await other.request('/api/expenses','PUT',expense);check('Autre boutique refuse dépense sans erreur interne',[403,404].includes(r.status),{status:r.status});
 const ownExpense=await db.from('expenses').select('amount').eq('id',f.expenseId).eq('organization_id',f.organizationId).single();check('Dépense intacte après tentative cross-boutique',Number(ownExpense.data?.amount)===2000);
 r=await owner.request('/api/expenses?month='+date.slice(0,7));check('Liste dépenses récurrentes nécessite migration dédiée',r.status===200,{status:r.status,waitingForMigration:r.status===503});
 // A temporary fixture counter verifies the real SQL boundary without creating 99 fake orders.
 await db.from('subscription_grants').update({revoked_at:new Date().toISOString()}).eq('id',f.grantId).eq('organization_id',f.organizationId);
 r=await owner.request('/api/delivery-drivers','POST',{name:'QA au-delà limite',phone:''});check('Découverte refuse un deuxième livreur',r.status===402,{status:r.status});
 r=await owner.request('/api/team','POST',{full_name:'QA hors limite',email:`qa-limit-${Date.now()}@example.com`,password:'Qa!TemporaryLimit9',role:'employee'});check('Découverte refuse un utilisateur supplémentaire',r.status===402,{status:r.status});
 await db.from('organization_usage').upsert({organization_id:f.organizationId,month,orders_count:99},{onConflict:'organization_id,month'});
 const payload={client_name:'QA limite simultanée',channel:'magasin',order_date:date,seller_id:owner.id,lines:[{product_id:f.productId,quantity:1}]};
 const parallel=await Promise.all([owner.request('/api/orders','POST',payload),owner.request('/api/orders','POST',payload)]);check('100e commande autorisée et 101e concurrente refusée',parallel.filter(x=>x.status===201).length===1&&parallel.filter(x=>x.status===402).length===1,{statuses:parallel.map(x=>x.status)});
 const usage=await db.from('organization_usage').select('orders_count').eq('organization_id',f.organizationId).eq('month',month).single();check('Compteur jamais supérieur à 100',usage.data?.orders_count===100,{ordersCount:usage.data?.orders_count});
 const liveFree=await owner.request('/api/lives','POST',{name:'QA Découverte live',session_date:date,slot:'morning',target_amount:1000,status:'planned'});check('Session live incluse en Découverte',liveFree.status===201,{status:liveFree.status});
}catch(error){check('Vérification complète',false,{error:error.message})}finally{
 const count=await db.from('orders').select('id',{count:'exact',head:true}).eq('organization_id',f.organizationId).gte('created_at',month);
 if(count.count!==null)await db.from('organization_usage').upsert({organization_id:f.organizationId,month,orders_count:count.count},{onConflict:'organization_id,month'});
 await db.from('subscription_grants').update({revoked_at:null}).eq('id',f.grantId).eq('organization_id',f.organizationId);
 if(f.crossGoalId){const me=await other.request('/api/me');await db.from('monthly_goals').delete().eq('id',f.crossGoalId).eq('organization_id',me.data.profile.organization_id);}
}
fs.writeFileSync('docs/reports/launch-qa/advanced-verify.json',JSON.stringify({checkedAt:new Date().toISOString(),scope:'Boutique QA seulement. Business temporaire sans paiement ; compteur99 de test restauré au nombre réel de commandes en fin de test.',checks},null,2));console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.ok).length}));
