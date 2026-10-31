import {PGlite} from '@electric-sql/pglite'
import {readFile,readdir} from 'node:fs/promises'
import {beforeAll,afterAll,describe,it,expect} from 'vitest'
let db:PGlite
const org='10000000-0000-4000-8000-000000000001',owner='20000000-0000-4000-8000-000000000001'
async function prepare(plan='pro',mode='test') {return (await db.query<{invoice:Record<string,unknown>}>(`SELECT prepare_billing_invoice($1,$2,$3,$4,'monthly','https://warko.app','CI') invoice`,[org,owner,mode,plan])).rows[0].invoice}
function event(invoice:Record<string,unknown>,id:string,status='paid') {return {id:`evt_${id}_${status}`,type:status==='paid'?'payment.succeeded':'payment.reversed',createdAt:'2026-10-29T00:00:00Z',data:{payment:{id:`pay_${id}`,mode:invoice.mode,status,amount:invoice.amount,currency:'XOF',reference:invoice.reference,metadata:{orderId:invoice.id,organizationId:org}}}}}
async function apply(e:object,mode='test') {return db.query('SELECT apply_moneriz_event($1,$2::jsonb)',[mode,JSON.stringify(e)])}
async function effective() {return (await db.query<{plan:string}>('SELECT effective_subscription_plan($1) plan',[org])).rows[0].plan}
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'authenticated'::text $$;
 CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE SCHEMA cron;CREATE TABLE cron.job(jobid bigint,jobname text);
 CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
 CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated,anon,service_role;`)
 for(const f of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) await db.exec((await readFile(`supabase/migrations/${f}`,'utf8')).replace('CREATE EXTENSION IF NOT EXISTS pg_cron;',''))
 await db.exec(`INSERT INTO organizations(id,name) VALUES('${org}','Boutique');INSERT INTO auth.users(id) VALUES('${owner}');INSERT INTO profiles(id,full_name,role,organization_id) VALUES('${owner}','Owner','admin','${org}');INSERT INTO sales_people(id,organization_id,full_name) VALUES('${owner}','${org}','Owner');UPDATE organizations SET owner_id='${owner}' WHERE id='${org}';SELECT set_config('request.jwt.claim.sub','${owner}',false);`)
},60000)
afterAll(async()=>{await db?.close()})
describe('billing SQL authoritative payments',()=>{
 it('starts free and freezes one idempotent invoice at server price',async()=>{
 expect(await effective()).toBe('discovery');const [a,b]=await Promise.all([prepare(),prepare()]);expect(a.id).toBe(b.id);expect(a.amount).toBe(5000)
 await expect(prepare('business')).rejects.toThrow('BILLING_PAYMENT_PENDING')
 })
 it('rejects a forged amount atomically',async()=>{const inv=await prepare();const e=event(inv,'bad');e.data.payment.amount=1;await expect(apply(e)).rejects.toThrow('BILLING_PAYMENT_MISMATCH');expect(await effective()).toBe('discovery')})
 it('grants once and queues one receipt despite duplicate webhooks',async()=>{const inv=await prepare(),e=event(inv,'one');await Promise.all([apply(e),apply(e)]);expect(await effective()).toBe('pro');expect((await db.query('SELECT * FROM subscription_grants')).rows).toHaveLength(1);expect((await db.query("SELECT * FROM notification_jobs WHERE kind='billing_receipt'")).rows).toHaveLength(1)})
 it('separates test entitlements from live mode',async()=>{await db.exec("UPDATE billing_settings SET mode='live'");expect(await effective()).toBe('discovery');await db.exec("UPDATE billing_settings SET mode='test'");expect(await effective()).toBe('pro')})
 it('stacks renewal periods rather than losing paid days',async()=>{const inv=await prepare();await apply(event(inv,'two'));const rows=(await db.query<{period_start:Date;period_end:Date}>('SELECT period_start,period_end FROM subscription_grants ORDER BY period_start')).rows;expect(rows).toHaveLength(2);expect(String(rows[1].period_start)).toBe(String(rows[0].period_end))})
 it('revokes only the reversed invoice and ignores late paid replay',async()=>{const inv=(await db.query<{invoice:Record<string,unknown>}>("SELECT to_jsonb(i) invoice FROM billing_invoices i WHERE payment_id='pay_one'")).rows[0].invoice;await apply(event(inv,'one','reversed'));expect(await effective()).toBe('discovery');await apply({...event(inv,'one'),id:'evt_late_paid'});expect(await effective()).toBe('discovery')})
 it('rejects another organization owner',async()=>{await expect(db.query(`SELECT prepare_billing_invoice($1,'20000000-0000-4000-8000-000000000099','test','pro','monthly','https://warko.app','CI')`,[org])).rejects.toThrow('BILLING_OWNER_REQUIRED')})
 it('prevents browser clients from minting grants or applying events',async()=>{await db.exec('SET ROLE authenticated');try {await expect(db.query("INSERT INTO subscription_grants(organization_id,plan,period_start,period_end) VALUES($1,'business',now(),now()+interval '1 year')",[org])).rejects.toThrow('permission denied');await expect(apply({})).rejects.toThrow('permission denied')}finally{await db.exec('RESET ROLE')}})
 it('keeps the 100th order and rejects the 101st without reserving quota',async()=>{
  for(let i=0;i<100;i++) await db.query("INSERT INTO orders(client_name,channel,organization_id,seller_id) VALUES('Awa','facebook',$1,$2)",[org,owner])
  await expect(db.query("INSERT INTO orders(client_name,channel,organization_id,seller_id) VALUES('Awa','facebook',$1,$2)",[org,owner])).rejects.toThrow('PLAN_ORDER_LIMIT')
  expect((await db.query<{orders_count:number}>('SELECT orders_count FROM organization_usage WHERE organization_id=$1',[org])).rows[0].orders_count).toBe(100)
 })
 it('counts only active drivers, allowing archival and replacement',async()=>{
  await db.query("INSERT INTO delivery_drivers(name,organization_id) VALUES('Moussa',$1)",[org])
  await expect(db.query("INSERT INTO delivery_drivers(name,organization_id) VALUES('Autre',$1)",[org])).rejects.toThrow('PLAN_DRIVER_LIMIT')
  await db.query('UPDATE delivery_drivers SET is_active=false WHERE organization_id=$1',[org])
  await db.query("INSERT INTO delivery_drivers(name,organization_id) VALUES('Remplaçant',$1)",[org])
  expect((await db.query('SELECT * FROM delivery_drivers WHERE organization_id=$1',[org])).rows).toHaveLength(2)
 })
 it('aggregates real SaaS usage without inventing paid revenue',async()=>{const data=(await db.query<{metrics:{signups:number;mrr:number;ordersLast7Days:number}}>('SELECT platform_saas_metrics() metrics')).rows[0].metrics;expect(data.signups).toBe(1);expect(data.mrr).toBe(0);expect(data.ordersLast7Days).toBe(100)})
 it('blocks extra users on Discovery',async()=>{
  await db.exec("INSERT INTO auth.users(id) VALUES('20000000-0000-4000-8000-000000000002')")
  await expect(db.query("INSERT INTO profiles(id,full_name,role,organization_id) VALUES('20000000-0000-4000-8000-000000000002','Employee','employee',$1)",[org])).rejects.toThrow('PLAN_USER_LIMIT')
 })

 it('uses a current paid Pro period before an expired Business grace period',async()=>{
  await db.exec('BEGIN')
  try {
   await db.query("INSERT INTO subscription_grants(organization_id,plan,period_start,period_end) VALUES($1,'business',now()-interval '1 month',now()-interval '1 hour'),($1,'pro',now()-interval '1 hour',now()+interval '1 month')",[org])
   expect(await effective()).toBe('pro')
  } finally {await db.exec('ROLLBACK')}
 })
 it('allows exactly three grace days and cancellation disables grace',async()=>{
  await db.exec('BEGIN')
  try {
   await db.query("INSERT INTO subscription_grants(organization_id,plan,period_start,period_end) VALUES($1,'pro',now()-interval '1 month',now()-interval '2 days')",[org])
   expect(await effective()).toBe('pro')
   await db.query('UPDATE organization_subscriptions SET cancel_at_period_end=true WHERE organization_id=$1',[org])
   expect(await effective()).toBe('discovery')
   await db.query('UPDATE organization_subscriptions SET cancel_at_period_end=false WHERE organization_id=$1',[org])
   expect((await db.query<{plan:string}>("SELECT effective_subscription_plan($1,now()+interval '2 days') plan",[org])).rows[0].plan).toBe('discovery')
  } finally {await db.exec('ROLLBACK')}
 })
 it('commits seller attribution with FIFO and rolls back invalid live associations',async()=>{
  await db.exec('BEGIN')
  try {
   await db.query("INSERT INTO subscription_grants(organization_id,plan,period_start,period_end) VALUES($1,'business',now(),now()+interval '1 month')",[org])
   const product=(await db.query<{id:string}>("INSERT INTO products(name,sale_price,organization_id) VALUES('Test',5000,$1) RETURNING id",[org])).rows[0].id
   await db.query('INSERT INTO stock_lots(product_id,organization_id,quantity_received,quantity_available,purchase_cost,import_cost,packaging_cost,unit_cost,sale_price) VALUES($1,$2,5,5,1000,0,0,1000,5000)',[product,org])
   const input={client_name:'Awa',channel:'facebook',order_date:'2026-10-29',seller_id:owner,lines:[{product_id:product,quantity:1}]}
   const result=(await db.query<{id:string}>('SELECT create_order_complete($1::jsonb) id',[JSON.stringify(input)])).rows[0].id
   expect((await db.query<{seller_id:string}>('SELECT seller_id FROM orders WHERE id=$1',[result])).rows[0].seller_id).toBe(owner)
   await db.exec('SAVEPOINT invalid_live')
   await expect(db.query('SELECT create_order_complete($1::jsonb)',[JSON.stringify({...input,live_session_id:'30000000-0000-4000-8000-000000000099'})])).rejects.toThrow('LIVE_SESSION_NOT_ACTIVE')
   await db.exec('ROLLBACK TO SAVEPOINT invalid_live')
   expect((await db.query<{quantity_available:number}>('SELECT quantity_available FROM stock_lots WHERE product_id=$1',[product])).rows[0].quantity_available).toBe(4)
  } finally {await db.exec('ROLLBACK')}
 })

 it('deduplicates event IDs inside each mode without blocking the other mode',async()=>{
  const e={id:'evt_shared_identifier',type:'wallet.updated',createdAt:'2026-10-29T00:00:00Z',data:{}}
  await apply(e,'test');await apply(e,'live')
  expect((await db.query("SELECT * FROM moneriz_events WHERE id='evt_shared_identifier'")).rows).toHaveLength(2)
 })

 it('lets Discovery create, start and sell in a live while keeping tenant and status checks',async()=>{
  await db.exec('BEGIN')
  try {
   expect(await effective()).toBe('discovery')
   await db.query('UPDATE organization_usage SET orders_count=0 WHERE organization_id=$1',[org])
   const live=(await db.query<{id:string}>("INSERT INTO live_sessions(name,organization_id,session_date,slot,status) VALUES('Live gratuit',$1,CURRENT_DATE,'morning','planned') RETURNING id",[org])).rows[0].id
   await db.query("UPDATE live_sessions SET status='active' WHERE id=$1",[live])
   const product=(await db.query<{id:string}>("INSERT INTO products(name,sale_price,organization_id) VALUES('Produit live',5000,$1) RETURNING id",[org])).rows[0].id
   await db.query('INSERT INTO stock_lots(product_id,organization_id,quantity_received,quantity_available,purchase_cost,import_cost,packaging_cost,unit_cost,sale_price) VALUES($1,$2,5,5,1000,0,0,1000,5000)',[product,org])
   const input={client_name:'Awa',channel:'facebook',order_date:'2026-10-29',seller_id:owner,live_session_id:live,lines:[{product_id:product,quantity:1}]}
   const id=(await db.query<{id:string}>('SELECT create_order_complete($1::jsonb) id',[JSON.stringify(input)])).rows[0].id
   expect((await db.query<{live_session_id:string}>('SELECT live_session_id FROM orders WHERE id=$1',[id])).rows[0].live_session_id).toBe(live)
   await db.query("UPDATE live_sessions SET status='completed' WHERE id=$1",[live])
   await db.exec('SAVEPOINT closed_live')
   await expect(db.query('SELECT create_order_complete($1::jsonb)',[JSON.stringify(input)])).rejects.toThrow('LIVE_SESSION_NOT_ACTIVE')
   await db.exec('ROLLBACK TO SAVEPOINT closed_live')
   await db.query("INSERT INTO organizations(id,name) VALUES('10000000-0000-4000-8000-000000000099','Autre boutique')")
   const other=(await db.query<{id:string}>("INSERT INTO live_sessions(name,organization_id,session_date,slot,status) VALUES('Autre live','10000000-0000-4000-8000-000000000099',CURRENT_DATE,'morning','active') RETURNING id")).rows[0].id
   await db.exec('SAVEPOINT other_live')
   await expect(db.query('SELECT create_order_complete($1::jsonb)',[JSON.stringify({...input,live_session_id:other})])).rejects.toThrow('LIVE_SESSION_NOT_ACTIVE')
   await db.exec('ROLLBACK TO SAVEPOINT other_live')
  } finally {await db.exec('ROLLBACK')}
 })

})
