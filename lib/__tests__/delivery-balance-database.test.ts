import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
let db: PGlite
const org = 'a0000000-0000-4000-8000-000000000001'
const otherOrg = 'a0000000-0000-4000-8000-000000000002'
const manager = 'b0000000-0000-4000-8000-000000000001'
const employee = 'b0000000-0000-4000-8000-000000000002'
let driver: string, otherDriver: string, product: string
async function assign(day: string | null = '2026-10-27') {
  const result = await db.query<{id:string}>(`SELECT create_order_with_fifo('Awa','0701020304','facebook','2026-10-01',$1,NULL,500,1000,'cash',$2::jsonb,$3::date) AS id`, [driver, JSON.stringify([{product_id:product,quantity:3,discount_type:'amount',discount_value:1000,discount_reason:'Promotion'}]), day])
  return result.rows[0].id
}
async function attempts(id: string) {
  return (await db.query<{assignment_date:string;status:string;driver_id:string;remittable_amount:string}>('SELECT assignment_date::text,status,driver_id,remittable_amount::text FROM order_delivery_assignments WHERE order_id=$1 ORDER BY assignment_date',[id])).rows
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'authenticated'::text $$;
    CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE SCHEMA cron; CREATE TABLE cron.job(jobid bigint,jobname text);
    CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
    CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated,anon,service_role;`)
  for (const file of (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort()) {
    if (file.endsWith('_daily_delivery_balance.sql')) {
      await db.exec(`INSERT INTO organizations(id,name) VALUES('c0000000-0000-4000-8000-000000000001','Ancienne boutique');
        INSERT INTO auth.users(id) VALUES('c0000000-0000-4000-8000-000000000002');
        INSERT INTO profiles(id,full_name,role,organization_id) VALUES('c0000000-0000-4000-8000-000000000002','Ancien','employee','c0000000-0000-4000-8000-000000000001');
        INSERT INTO sales_people(id,organization_id,full_name) VALUES('c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','Ancien');
        INSERT INTO delivery_drivers(id,organization_id,name) VALUES('c0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001','Ancien livreur');
        INSERT INTO orders(id,organization_id,client_name,channel,seller_id,delivery_driver_id,order_date) VALUES('c0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000001','Historique','facebook','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003','2020-01-01');`)
    }
    await db.exec((await readFile(`supabase/migrations/${file}`, 'utf8')).replace('CREATE EXTENSION IF NOT EXISTS pg_cron;', ''))
  }
  await db.exec(`INSERT INTO organizations(id,name) VALUES('${org}','Boutique'),('${otherOrg}','Autre');
    INSERT INTO auth.users(id) VALUES('${manager}'),('${employee}');
    INSERT INTO profiles(id,full_name,role,organization_id) VALUES('${manager}','Responsable','manager','${org}'),('${employee}','Employé','employee','${org}');
    INSERT INTO sales_people(id,organization_id,profile_id,full_name) VALUES('${manager}','${org}','${manager}','Responsable');
    SELECT set_config('request.jwt.claim.sub','${manager}',false);`)
  driver = (await db.query<{id:string}>("INSERT INTO delivery_drivers(organization_id,name) VALUES($1,'Ali') RETURNING id",[org])).rows[0].id
  otherDriver = (await db.query<{id:string}>("INSERT INTO delivery_drivers(organization_id,name) VALUES($1,'Autre') RETURNING id",[otherOrg])).rows[0].id
  product = (await db.query<{id:string}>(`INSERT INTO products(name,sale_price,stock_quantity,organization_id,pricing_mode) VALUES('Parfum',5000,100,$1,'unit') RETURNING id`,[org])).rows[0].id
  await db.query(`INSERT INTO stock_lots(product_id,organization_id,quantity_received,quantity_available,purchase_cost,import_cost,packaging_cost,unit_cost,sale_price) VALUES($1,$2,100,100,1000,0,0,1000,5000)`,[product,org])
  const foreignSeller = (await db.query<{id:string}>(`INSERT INTO sales_people(organization_id,full_name) VALUES($1,'Vendeur autre boutique') RETURNING id`,[otherOrg])).rows[0].id
  await db.query(`INSERT INTO orders(organization_id,client_name,channel,seller_id,delivery_driver_id,delivery_date) VALUES($1,'Client autre boutique','facebook',$2,$3,'2026-10-27')`,[otherOrg,foreignSeller,otherDriver])
},60000)
afterAll(async()=>{await db?.close()})

describe('journées de tournée en SQL',()=>{
  it('ne déduit aucune tournée historique de la date de création', async()=>{
    expect((await db.query('SELECT delivery_date FROM orders WHERE id=$1',['c0000000-0000-4000-8000-000000000004'])).rows[0]).toEqual({delivery_date:null})
    expect(await attempts('c0000000-0000-4000-8000-000000000004')).toHaveLength(0)
  })
  it('permet de dater une ancienne livraison archivée mais pas de changer son livreur',async()=>{
    const id='c0000000-0000-4000-8000-000000000004'
    await db.query(`UPDATE orders SET status='delivered' WHERE id=$1`,[id])
    await expect(db.query('UPDATE orders SET delivery_driver_id=NULL WHERE id=$1',[id])).rejects.toThrow('DELIVERY_ASSIGNMENT_LOCKED')
    await db.query(`UPDATE delivery_drivers SET is_active=false WHERE id='c0000000-0000-4000-8000-000000000003'`)
    await db.query(`UPDATE orders SET delivery_date='2020-01-01' WHERE id=$1`,[id])
    expect((await attempts(id))[0]).toMatchObject({assignment_date:'2020-01-01',status:'delivered'})
  })
  it('utilise le jour confié, snapshot net après remise et dépôt, sans frais ni coûts',async()=>{
    const id = await assign()
    expect(await attempts(id)).toEqual([{assignment_date:'2026-10-27',status:'in_progress',driver_id:driver,remittable_amount:'13000.00'}])
    await db.query('SELECT update_order_status_safe($1,$2)',[id,'delivered'])
    expect((await attempts(id))[0]).toMatchObject({status:'delivered',remittable_amount:'13000.00'})
    await expect(db.query(`UPDATE orders SET delivery_date='2026-10-28' WHERE id=$1`,[id])).rejects.toThrow('DELIVERY_ASSIGNMENT_LOCKED')
  })
  it('préserve le bilan de la veille après report et reprise le lendemain sans rendre du stock',async()=>{
    const id = await assign()
    const before = (await db.query('SELECT stock_quantity FROM products WHERE id=$1',[product])).rows
    await db.query('SELECT update_order_status_safe($1,$2)',[id,'postponed'])
    expect((await db.query('SELECT stock_quantity FROM products WHERE id=$1',[product])).rows).toEqual(before)
    await db.query(`UPDATE orders SET delivery_date='2026-10-28' WHERE id=$1`,[id])
    expect(await attempts(id)).toEqual([
      {assignment_date:'2026-10-27',status:'postponed',driver_id:driver,remittable_amount:'13000.00'},
      {assignment_date:'2026-10-28',status:'in_progress',driver_id:driver,remittable_amount:'13000.00'},
    ])
    await db.query('SELECT update_order_status_safe($1,$2)',[id,'delivered'])
    expect((await attempts(id))[0].status).toBe('postponed')
    expect((await attempts(id))[1].status).toBe('delivered')
  })
  it('conserve le premier livreur comme reporté lors d’un transfert à un autre le même jour',async()=>{
    const id=await assign()
    await db.query('SELECT update_order_status_safe($1,$2)',[id,'postponed'])
    const replacement=(await db.query<{id:string}>(`INSERT INTO delivery_drivers(organization_id,name) VALUES($1,'Relais') RETURNING id`,[org])).rows[0].id
    await db.query('UPDATE orders SET delivery_driver_id=$1 WHERE id=$2',[replacement,id])
    const rows=await attempts(id)
    expect(rows).toHaveLength(2)
    expect(rows.find(row=>row.driver_id===driver)).toMatchObject({status:'postponed'})
    expect(rows.find(row=>row.driver_id===replacement)).toMatchObject({status:'in_progress'})
  })
  it('actualise le montant courant après une remise, annule une seule fois et refuse une réaffectation étrangère',async()=>{
    const id = await assign()
    const row = (await db.query<{id:string}>('SELECT id FROM order_lines WHERE order_id=$1',[id])).rows[0]
    await db.query('SELECT update_order_discounts_safe($1,$2::jsonb)',[id,JSON.stringify([{id:row.id,discount_type:'percent',discount_value:20,discount_reason:'Promo'}])])
    expect((await attempts(id))[0].remittable_amount).toBe('11000.00')
    await expect(db.query('UPDATE orders SET delivery_driver_id=$1 WHERE id=$2',[otherDriver,id])).rejects.toThrow('INVALID_DELIVERY_DRIVER')
    await db.query('SELECT update_order_status_safe($1,$2)',[id,'cancelled'])
    const stock=(await db.query('SELECT stock_quantity FROM products WHERE id=$1',[product])).rows
    await db.query('SELECT update_order_status_safe($1,$2)',[id,'cancelled'])
    expect((await db.query('SELECT stock_quantity FROM products WHERE id=$1',[product])).rows).toEqual(stock)
    expect((await attempts(id))[0].status).toBe('cancelled')
  })
  it('autorise le responsable à lire sa boutique mais interdit les écritures et les lectures employé',async()=>{
    await assign()
    try {
      await db.exec('SET ROLE authenticated')
      expect((await db.query('SELECT * FROM order_delivery_assignments')).rows.length).toBeGreaterThan(0)
      expect((await db.query<{organization_id:string}>('SELECT organization_id FROM order_delivery_assignments')).rows.every(row=>row.organization_id===org)).toBe(true)
      expect((await db.query('SELECT * FROM order_delivery_assignments WHERE organization_id=$1',[otherOrg])).rows).toHaveLength(0)
      await expect(db.query('UPDATE order_delivery_assignments SET remittable_amount=0')).rejects.toThrow('permission denied')
      await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`,[employee])
      expect((await db.query('SELECT * FROM order_delivery_assignments')).rows).toHaveLength(0)
    } finally {
      await db.exec('RESET ROLE')
      await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`,[manager])
    }
  })
})
