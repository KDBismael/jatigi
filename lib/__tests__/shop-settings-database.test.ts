import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const db=new PGlite()
beforeAll(async()=>{
 await db.exec('CREATE TABLE public.organizations (id text PRIMARY KEY, name text NOT NULL);')
 await db.exec(readFileSync('supabase/migrations/20261029163549_shop_onboarding_settings.sql','utf8'))
})
afterAll(()=>db.close())
describe('contraintes boutique en base PostgreSQL',()=>{
 it('applique les valeurs CI, XOF, zéro frais et aucune étape fictive',async()=>{
  await db.exec("INSERT INTO organizations(id,name) VALUES ('shop','Boutique')")
  const {rows}=await db.query('SELECT country,currency,default_delivery_fee,onboarding_step,onboarding_skipped_steps,notifications_unsubscribed_at FROM organizations')
  expect(rows[0]).toEqual({country:'CI',currency:'XOF',default_delivery_fee:'0.00',onboarding_step:null,onboarding_skipped_steps:[],notifications_unsubscribed_at:null})
 })
 it.each(["country='FR'","currency='EUR'","default_delivery_fee=-1","onboarding_step=4","onboarding_skipped_steps=ARRAY[1,4]"])('rejette %s',async assignment=>{
  await expect(db.exec(`UPDATE organizations SET ${assignment} WHERE id='shop'`)).rejects.toThrow()
 })
})
