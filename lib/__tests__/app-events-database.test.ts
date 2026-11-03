import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
import { afterAll, beforeAll, expect, it } from 'vitest'

let db: PGlite
const shop = '10000000-0000-4000-8000-0000000000a1', internal = '10000000-0000-4000-8000-0000000000a2'
const owner = '20000000-0000-4000-8000-0000000000a1', staff = '20000000-0000-4000-8000-0000000000a2'
const anon = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
type Report = {
  funnel: Record<string, number>
  daily: { day: string; visitors: number; signups: number }[]
  sources: { source: string; visitors: number }[]
  actions: { name: string; events: number; shops: number }[]
}
const report = async (from: string, to: string, excluded: string[] = []) =>
  (await db.query<{ r: Report }>('SELECT platform_event_report($1::date,$2::date,$3::uuid[]) r', [from, to, excluded])).rows[0].r

beforeAll(async () => {
  db = new PGlite()
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
  for (const f of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort())
    await db.exec((await readFile(`supabase/migrations/${f}`, 'utf8')).replace('CREATE EXTENSION IF NOT EXISTS pg_cron;', ''))
  await db.exec(`
  INSERT INTO auth.users(id) VALUES('${owner}'),('${staff}');
  INSERT INTO organizations(id,name,created_at) VALUES('${shop}','Boutique','2026-10-10'),('${internal}','Interne','2026-10-11');
  INSERT INTO profiles(id,full_name,role,organization_id) VALUES('${owner}','Owner','admin','${shop}'),('${staff}','Staff','admin','${internal}');
  UPDATE organizations SET owner_id='${owner}' WHERE id='${shop}';UPDATE organizations SET owner_id='${staff}' WHERE id='${internal}';
  INSERT INTO app_events(name,anonymous_id,props,created_at) VALUES
   ('landing_view','${anon(1)}','{"source":"facebook"}','2026-10-10 09:00'),('landing_view','${anon(1)}','{"source":"facebook"}','2026-10-10 10:00'),
   ('landing_view','${anon(2)}','{}','2026-10-10 11:00'),('landing_view','${anon(3)}','{"source":"tiktok"}','2026-10-12 08:00'),
   ('cta_signup','${anon(1)}','{}','2026-10-10 09:01'),('signup_view','${anon(1)}','{}','2026-10-10 09:02'),
   ('landing_view','${anon(9)}','{}','2026-09-01 08:00');
  INSERT INTO app_events(name,anonymous_id,organization_id,created_at) VALUES
   ('order_created','${anon(1)}','${shop}','2026-10-11'),('order_created','${anon(1)}','${shop}','2026-10-12'),
   ('order_created','${anon(5)}','${internal}','2026-10-12');`)
}, 60000)
afterAll(async () => { await db?.close() })

it('counts unique visitors and the signup funnel for the period', async () => {
  const r = await report('2026-10-01', '2026-10-31')
  expect(r.funnel).toMatchObject({ visitors: 3, signupClicks: 1, signupViews: 1, signups: 2, onboarded: 0, firstOrder: 0, paid: 0 })
  expect(r.sources).toEqual([{ source: 'direct', visitors: 1 }, { source: 'facebook', visitors: 1 }, { source: 'tiktok', visitors: 1 }])
  expect(r.daily.find(d => d.day === '2026-10-10')).toEqual({ day: '2026-10-10', visitors: 2, signups: 1 })
  expect(r.daily).toHaveLength(31)
})

it('leaves internal shops out of signups and action counts', async () => {
  const r = await report('2026-10-01', '2026-10-31', [internal])
  expect(r.funnel.signups).toBe(1)
  expect(r.actions).toEqual([{ name: 'order_created', events: 2, shops: 1 }])
})

it('keeps the events table and report away from browser roles', async () => {
  await db.exec('SET ROLE authenticated')
  try {
    await expect(db.query("INSERT INTO app_events(name,anonymous_id) VALUES('landing_view',$1)", [anon(7)])).rejects.toThrow()
    await expect(db.query("SELECT platform_event_report('2026-10-01','2026-10-31','{}')")).rejects.toThrow()
  } finally { await db.exec('RESET ROLE') }
})

it('rejects malformed names and oversized props', async () => {
  await expect(db.query("INSERT INTO app_events(name,anonymous_id) VALUES('Bad Name',$1)", [anon(8)])).rejects.toThrow()
  await expect(db.query("INSERT INTO app_events(name,anonymous_id,props) VALUES('landing_view',$1,$2::jsonb)", [anon(8), JSON.stringify({ x: 'y'.repeat(3000) })])).rejects.toThrow()
})
