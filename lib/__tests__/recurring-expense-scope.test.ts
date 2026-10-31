import {PGlite} from '@electric-sql/pglite'
import {readFile,readdir} from 'node:fs/promises'
import {expect,it} from 'vitest'
it('generates recurring expenses only for the requested shop, once, and refuses public execution',async()=>{const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE TABLE public.sales_people(id uuid,organization_id uuid,is_active boolean,salary_mode text,hired_on date,ended_on date);CREATE TABLE public.expense_recurrences(id uuid,organization_id uuid,category text,label text,amount numeric,day_of_month integer,is_active boolean,starts_on date,ends_on date,sales_person_id uuid);CREATE TABLE public.expenses(id uuid DEFAULT gen_random_uuid(),organization_id uuid,category text,label text,amount numeric,expense_date date,recurrence_id uuid,recurrence_month date,sales_person_id uuid);CREATE UNIQUE INDEX recurring_once ON public.expenses(recurrence_id,recurrence_month) WHERE recurrence_id IS NOT NULL;GRANT USAGE ON SCHEMA public TO service_role,authenticated,anon;GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;INSERT INTO public.expense_recurrences(id,organization_id,category,label,amount,day_of_month,is_active,starts_on) VALUES('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','rent','QA A',1000,1,true,'2026-01-01'),('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','rent','QA B',2000,1,true,'2026-01-01');`)
 const file=(await readdir('supabase/migrations')).find(f=>f.endsWith('_tenant_recurring_expenses.sql'))!;await db.exec(await readFile('supabase/migrations/'+file,'utf8'))
 await db.exec('SET ROLE service_role')
 expect((await db.query(`SELECT public.generate_org_recurring_expenses('20000000-0000-4000-8000-000000000001','2026-10-01') AS count`)).rows).toEqual([{count:1}])
 expect((await db.query(`SELECT public.generate_org_recurring_expenses('20000000-0000-4000-8000-000000000001','2026-10-01') AS count`)).rows).toEqual([{count:0}])
 expect((await db.query('SELECT label FROM public.expenses')).rows).toEqual([{label:'QA A'}])
 await db.exec('RESET ROLE; SET ROLE authenticated')
 await expect(db.query(`SELECT public.generate_org_recurring_expenses('20000000-0000-4000-8000-000000000002','2026-10-01')`)).rejects.toThrow(/permission denied/)
 }finally{await db.close()}},20000)
