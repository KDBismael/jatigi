import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'

let db: PGlite
const org = '10000000-0000-4000-8000-000000000001'
const otherOrg = '10000000-0000-4000-8000-000000000002'
const employee = '20000000-0000-4000-8000-000000000001'
const otherEmployee = '20000000-0000-4000-8000-000000000002'
let product: string
async function create(lines: object[], deposit = 0) {
  const result = await db.query<{ id: string }>(`SELECT create_order_with_fifo('Awa','0701020304','facebook',CURRENT_DATE,NULL,NULL,500,$1,$2,$3::jsonb) AS id`, [deposit, deposit ? 'cash' : null, JSON.stringify(lines)])
  return result.rows[0].id
}
async function line(orderId: string) {
  return (await db.query<Record<string, unknown>>('SELECT * FROM order_lines WHERE order_id=$1', [orderId])).rows[0]
}
async function discount(orderId: string, id: string, type: string, value: number, reason = 'Promotion') {
  return db.query('SELECT update_order_discounts_safe($1,$2::jsonb)', [orderId, JSON.stringify([{ id, discount_type: type, discount_value: value, discount_reason: reason }])])
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
    const sql = (await readFile(`supabase/migrations/${file}`, 'utf8')).replace('CREATE EXTENSION IF NOT EXISTS pg_cron;', '')
    if (file.endsWith('_order_discounts_and_branding.sql')) {
      await db.exec(`INSERT INTO organizations(id,name) VALUES('90000000-0000-4000-8000-000000000001','Historique');
        INSERT INTO auth.users(id) VALUES('90000000-0000-4000-8000-000000000002');
        INSERT INTO profiles(id,full_name,role,organization_id) VALUES('90000000-0000-4000-8000-000000000002','Ancien vendeur','employee','90000000-0000-4000-8000-000000000001');
        INSERT INTO sales_people(id,organization_id,full_name) VALUES('90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','Ancien vendeur');
        INSERT INTO products(id,name,sale_price,organization_id) VALUES('90000000-0000-4000-8000-000000000003','Historique',100,'90000000-0000-4000-8000-000000000001');
        INSERT INTO orders(id,client_name,channel,seller_id,organization_id) VALUES('90000000-0000-4000-8000-000000000004','Client historique','facebook','90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001');
        INSERT INTO order_lines(order_id,product_id,quantity,unit_price,unit_cost,line_total,total_cost) VALUES('90000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000003',1,100,20,100,20);`)
    }
    await db.exec(sql)
  }
  await db.exec(`INSERT INTO organizations(id,name) VALUES('${org}','Boutique'),('${otherOrg}','Autre');
    INSERT INTO auth.users(id) VALUES('${employee}'),('${otherEmployee}');
    INSERT INTO profiles(id,full_name,role,organization_id) VALUES('${employee}','Vendeur','employee','${org}'),('${otherEmployee}','Autre vendeur','employee','${otherOrg}');
    INSERT INTO sales_people(id,organization_id,profile_id,full_name) VALUES('${employee}','${org}','${employee}','Vendeur'),('${otherEmployee}','${otherOrg}','${otherEmployee}','Autre');
    SELECT set_config('request.jwt.claim.sub','${employee}',false);`)
  const result = await db.query<{ id: string }>(`INSERT INTO products(name,sale_price,stock_quantity,organization_id,pricing_mode) VALUES('Parfum',5000,100,'${org}','both') RETURNING id`)
  product = result.rows[0].id
  await db.query(`INSERT INTO stock_lots(product_id,organization_id,quantity_received,quantity_available,purchase_cost,import_cost,packaging_cost,unit_cost,sale_price) VALUES($1,$2,100,100,1000,0,0,1000,5000)`, [product, org])
}, 60000)
afterAll(async () => { await db?.close() })

describe('transactions SQL des remises', () => {
  it('conserve les commandes antérieures à la migration sans remise', async () => {
    expect(await line('90000000-0000-4000-8000-000000000004')).toMatchObject({ line_subtotal: '100.00', line_total: '100.00', discount_type: 'none', discount_amount: '0.00', total_cost: '20.00' })
  })
  it('refuse les appels anonymes', async () => {
    await db.exec("SELECT set_config('request.jwt.claim.sub','',false)")
    await expect(db.query('SELECT update_order_discounts_safe($1,$2)', ['90000000-0000-4000-8000-000000000004', '[]'])).rejects.toThrow('UNAUTHORIZED')
    await db.exec(`SELECT set_config('request.jwt.claim.sub','${employee}',false)`)
  })

  it('crée une commande remisée, conserve les coûts et le stock FIFO', async () => {
    const id = await create([{ product_id: product, quantity: 3, discount_type: 'amount', discount_value: 1000, discount_reason: 'Promotion' }])
    expect(await line(id)).toMatchObject({ line_subtotal: '15000.00', line_total: '14000.00', discount_amount: '1000.00', total_cost: '3000.00', discount_applied_by: employee })
    expect((await db.query<{ stock_quantity: number }>('SELECT stock_quantity FROM products WHERE id=$1', [product])).rows[0].stock_quantity).toBe(97)
  })
  it('refuse un motif vide et annule toute la création', async () => {
    const before = await db.query('SELECT stock_quantity FROM products WHERE id=$1', [product])
    await expect(create([{ product_id: product, quantity: 1, discount_type: 'amount', discount_value: 100, discount_reason: ' ' }])).rejects.toThrow()
    expect((await db.query('SELECT stock_quantity FROM products WHERE id=$1', [product])).rows).toEqual(before.rows)
  })
  it('modifie et supprime depuis le prix historique, pas le prix actuel', async () => {
    const id = await create([{ product_id: product, quantity: 2 }])
    const original = await line(id)
    await db.query('UPDATE products SET sale_price=6000 WHERE id=$1', [product])
    await discount(id, original.id as string, 'percent', 10)
    expect(await line(id)).toMatchObject({ line_subtotal: '10000.00', line_total: '9000.00', total_cost: '2000.00' })
    await discount(id, original.id as string, 'none', 0, '')
    expect(await line(id)).toMatchObject({ line_total: '10000.00', discount_amount: '0.00', discount_reason: null, discount_applied_by: null })
  })
  it('refuse les remises trop élevées et le total inférieur au dépôt', async () => {
    const id = await create([{ product_id: product, quantity: 1 }], 6000)
    const row = await line(id)
    await expect(discount(id, row.id as string, 'amount', 6001)).rejects.toThrow()
    await expect(discount(id, row.id as string, 'amount', 1000)).rejects.toThrow('DEPOSIT_EXCEEDS_TOTAL')
    expect((await line(id)).discount_amount).toBe('0.00')
    await expect(create([{ product_id: product, quantity: 1, discount_type: 'percent', discount_value: 100, discount_reason: 'Cadeau' }], 6000)).rejects.toThrow('DEPOSIT_EXCEEDS_TOTAL')
  })
  it('verrouille les commandes livrées ou annulées et les autres boutiques', async () => {
    for (const status of ['delivered', 'cancelled']) {
      const id = await create([{ product_id: product, quantity: 1 }])
      const row = await line(id)
      await db.query('SELECT update_order_status_safe($1,$2)', [id, status])
      await expect(discount(id, row.id as string, 'amount', 100)).rejects.toThrow('DISCOUNTS_LOCKED')
    }
    const id = await create([{ product_id: product, quantity: 1 }])
    const row = await line(id)
    await db.exec(`SELECT set_config('request.jwt.claim.sub','${otherEmployee}',false)`)
    await expect(discount(id, row.id as string, 'amount', 100)).rejects.toThrow('ORDER_NOT_FOUND')
    await db.exec(`SELECT set_config('request.jwt.claim.sub','${employee}',false)`)
  })
  it('applique une remise aux offres et utilise le montant net dans les rapports', async () => {
    const offer = (await db.query<{ id: string }>(`INSERT INTO product_offers(organization_id,product_id,name,units_per_offer,price) VALUES($1,$2,'Duo',2,9000) RETURNING id`, [org, product])).rows[0].id
    const id = await create([{ product_id: product, pricing_type: 'offer', offer_id: offer, offer_count: 2, discount_type: 'percent', discount_value: 10, discount_reason: 'Promotion duo' }])
    expect(await line(id)).toMatchObject({ quantity: 4, line_subtotal: '18000.00', line_total: '16200.00', total_cost: '4000.00' })
    await db.query(`UPDATE orders SET status='delivered',delivered_at=now() WHERE id=$1`, [id])
    const snapshot = (await db.query<{ snapshot: { revenue: number } }>('SELECT build_period_snapshot($1,CURRENT_DATE,CURRENT_DATE) AS snapshot', [org])).rows[0].snapshot
    expect(snapshot.revenue).toBe(16200)
  })
  it('annule toutes les modifications lorsqu’une ligne appartient à une autre commande', async () => {
    const id = await create([{ product_id: product, quantity: 1 }])
    const otherId = await create([{ product_id: product, quantity: 1 }])
    const own = await line(id), other = await line(otherId)
    await expect(db.query('SELECT update_order_discounts_safe($1,$2::jsonb)', [id, JSON.stringify([
      { id: own.id, discount_type: 'amount', discount_value: 100, discount_reason: 'Promotion' },
      { id: other.id, discount_type: 'amount', discount_value: 100, discount_reason: 'Promotion' },
    ])])).rejects.toThrow('LINE_NOT_FOUND')
    expect((await line(id)).discount_amount).toBe('0.00')
  })
  it('sérialise les requêtes de livraison et remise et garde la commande verrouillée', async () => {
    const id = await create([{ product_id: product, quantity: 1 }])
    const row = await line(id)
    const results = await Promise.allSettled([
      db.query('SELECT update_order_status_safe($1,$2)', [id, 'delivered']),
      discount(id, row.id as string, 'amount', 100),
    ])
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('rejected')
    expect((await line(id)).discount_amount).toBe('0.00')
  })
  it('autorise les lectures de prix sans donner accès aux coûts ni aux écritures directes', async () => {
    const id = await create([{ product_id: product, quantity: 1 }])
    try {
      await db.exec('SET ROLE authenticated')
      const rows = await db.query('SELECT unit_price,line_subtotal,discount_amount FROM order_lines WHERE order_id=$1', [id])
      expect(rows.rows).toHaveLength(1)
      await expect(db.query('SELECT unit_cost FROM order_lines WHERE order_id=$1', [id])).rejects.toThrow('permission denied')
      await expect(db.query('UPDATE order_lines SET line_total=0 WHERE order_id=$1', [id])).rejects.toThrow('permission denied')
    } finally { await db.exec('RESET ROLE') }
  })

  it('garde le verrouillage après une correction du statut d’une commande livrée', async () => {
    const id = await create([{ product_id: product, quantity: 1 }])
    const row = await line(id)
    await db.query('SELECT update_order_status_safe($1,$2)', [id, 'delivered'])
    await db.query('SELECT update_order_status_safe($1,$2)', [id, 'in_progress'])
    await expect(discount(id, row.id as string, 'amount', 100)).rejects.toThrow('DISCOUNTS_LOCKED')
  })

})

describe('archivage des livreurs en base', () => {
  it('préserve les commandes et versements, autorise le solde final, mais refuse une nouvelle affectation', async () => {
    const driver = (await db.query<{ id: string }>(`INSERT INTO delivery_drivers(organization_id,name) VALUES($1,'Ancien') RETURNING id`, [org])).rows[0].id
    const id = await create([{ product_id: product, quantity: 1 }])
    await db.query('UPDATE orders SET delivery_driver_id=$1 WHERE id=$2', [driver, id])
    await db.query(`INSERT INTO delivery_settlements(delivery_driver_id,organization_id,amount) VALUES($1,$2,1000)`, [driver, org])
    await db.query('UPDATE delivery_drivers SET is_active=false WHERE id=$1', [driver])
    await db.query(`UPDATE orders SET client_name='Nouveau nom',delivery_driver_id=$1 WHERE id=$2`, [driver, id])
    await db.query(`INSERT INTO delivery_settlements(delivery_driver_id,organization_id,amount) VALUES($1,$2,500)`, [driver, org])
    expect((await db.query('SELECT delivery_driver_id FROM orders WHERE id=$1', [id])).rows[0]).toEqual({ delivery_driver_id: driver })
    expect((await db.query('SELECT sum(amount)::text AS total FROM delivery_settlements WHERE delivery_driver_id=$1', [driver])).rows[0]).toEqual({ total: '1500.00' })
    await expect(db.query(`SELECT create_order_with_fifo('Awa',NULL,'facebook',CURRENT_DATE,$1,NULL,0,0,NULL,$2::jsonb)`, [driver, JSON.stringify([{ product_id: product, quantity: 1 }])])).rejects.toThrow('INVALID_DELIVERY_DRIVER')
    const another = await create([{ product_id: product, quantity: 1 }])
    await expect(db.query('UPDATE orders SET delivery_driver_id=$1 WHERE id=$2', [driver, another])).rejects.toThrow('INVALID_DELIVERY_DRIVER')
    await db.query('UPDATE delivery_drivers SET is_active=true WHERE id=$1', [driver])
    await db.query('UPDATE orders SET delivery_driver_id=$1 WHERE id=$2', [driver, another])
    const foreign = (await db.query<{ id: string }>(`INSERT INTO delivery_drivers(organization_id,name) VALUES($1,'Autre') RETURNING id`, [otherOrg])).rows[0].id
    await expect(db.query('UPDATE orders SET delivery_driver_id=$1 WHERE id=$2', [foreign, another])).rejects.toThrow('INVALID_DELIVERY_DRIVER')
  })
})
