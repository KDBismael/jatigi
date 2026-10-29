import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMonerizSession, getMonerizMode, getMonerizSecret, MonerizError, parseMonerizEvent, readMonerizPayment, readMonerizSession, verifyMonerizSignature, type MonerizCheckoutRequest } from '@/lib/billing/moneriz'
const now=1800000000000
const raw='{"ok":true}'
const secret='test-webhook-secret'
const signature=(time=now,body=raw)=>`t=${time},v1=${createHmac('sha256',secret).update(`${time}.${body}`).digest('hex')}`
const request:MonerizCheckoutRequest={amount:5000,currency:'XOF',title:'Accès Pro',country:'CI',reference:'intent-1',metadata:{orderId:'intent-1',organizationId:'org-1'},integrationMode:'redirect',successUrl:'https://warko.test/subscription',cancelUrl:'https://warko.test/subscription'}
const session={id:'cs_test123',mode:'test',amount:5000,currency:'XOF',reference:'intent-1',metadata:request.metadata,integrationMode:'redirect',checkoutUrl:'https://checkout.moneriz.com/payer/token',embedUrl:null,status:'open',paymentId:null}
const payment={id:'pay_test123',mode:'test',status:'paid',amount:5000,currency:'XOF',reference:'intent-1',metadata:request.metadata,paidAt:'2026-10-29T10:00:00Z'}
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
function mockResponse(body:unknown,status=200,headers:Record<string,string>={}) {const fetch=vi.fn().mockImplementation(async()=>new Response(JSON.stringify(body),{status,headers}));vi.stubGlobal('fetch',fetch);vi.stubEnv('MONERIZ_TEST_SECRET_KEY','izp_test_sk_example');return fetch}
describe('signature Moneriz sur corps brut',()=>{
 it('vérifie le HMAC exact et tolère cinq minutes incluses',()=>{expect(verifyMonerizSignature(raw,secret,signature(),now)).toBe(true);expect(verifyMonerizSignature(raw,secret,signature(now-300000),now)).toBe(true);expect(verifyMonerizSignature(raw,secret,signature(now+300000),now)).toBe(true)})
 it('rejette les corps modifiés, secret incorrect et rejeux anciens ou futurs',()=>{expect(verifyMonerizSignature(raw+' ',secret,signature(),now)).toBe(false);expect(verifyMonerizSignature(raw,'wrong',signature(),now)).toBe(false);expect(verifyMonerizSignature(raw,secret,signature(now-300001),now)).toBe(false);expect(verifyMonerizSignature(raw,secret,signature(now+300001),now)).toBe(false)})
 it.each(['','t=1','t=1,v1=bad',signature()+',t='+now,signature()+',v1='+'0'.repeat(64),signature()+',unknown=1','t=NaN,v1='+'0'.repeat(64),'t=9007199254740992,v1='+'0'.repeat(64)])('refuse un en-tête mal formé %s',header=>{expect(verifyMonerizSignature(raw,secret,header,now)).toBe(false)})
})
describe('enveloppes et modes Moneriz',()=>{
 it('valide les paiements, conserve les types inconnus et refuse formes ambiguës',()=>{
  expect(parseMonerizEvent({id:'evt_123',type:'payment.succeeded',createdAt:'2026-10-29T10:00:00Z',data:{payment}})?.data.payment?.amount).toBe(5000)
  expect(parseMonerizEvent({id:'evt_123',type:'future.event',createdAt:'2026-10-29T10:00:00Z',data:{future:true}})?.type).toBe('future.event')
  for(const invalid of [{...payment,id:'bad'},{...payment,mode:'production'},{...payment,amount:'5000'},{...payment,amount:5000.5},{...payment,currency:'EUR'}]) expect(parseMonerizEvent({id:'evt_123',type:'payment.succeeded',createdAt:'2026-10-29T10:00:00Z',data:{payment:invalid}})).toBeNull()
  expect(parseMonerizEvent({id:'bad',type:'payment.succeeded',createdAt:'invalid',data:{payment}})).toBeNull()
  expect(parseMonerizEvent({id:'evt_123',type:'payment.succeeded',createdAt:'2026-10-29T10:00:00Z',data:{}})).toBeNull()
 })
 it('sépare les secrets test/live et refuse une configuration douteuse',()=>{
  vi.stubEnv('MONERIZ_MODE','');expect(getMonerizMode()).toBe('test')
  vi.stubEnv('MONERIZ_MODE','live');expect(getMonerizMode()).toBe('live')
  vi.stubEnv('MONERIZ_TEST_SECRET_KEY','');vi.stubEnv('MONERIZ_LIVE_SECRET_KEY','');vi.stubEnv('MONERIZ_SECRET_KEY','izp_test_sk_example')
  expect(getMonerizSecret('test')).toBe('izp_test_sk_example');expect(()=>getMonerizSecret('live')).toThrow(MonerizError)
  vi.stubEnv('MONERIZ_LIVE_SECRET_KEY','izp_test_sk_wrong');expect(()=>getMonerizSecret('live')).toThrow(MonerizError)
  vi.stubEnv('MONERIZ_MODE','invalid');expect(()=>getMonerizMode()).toThrow(MonerizError)
 })
})
describe('checkout Moneriz sans nouvelle tentative implicite',()=>{
 it('réutilise exactement le JSON et la clé persistée',async()=>{
  const fetch=mockResponse(session,201)
  expect(await createMonerizSession('test','stable-idempotency-key',request)).toMatchObject({id:session.id,mode:session.mode,checkoutUrl:session.checkoutUrl})
  expect(await createMonerizSession('test','stable-idempotency-key',request)).toMatchObject({id:session.id,mode:session.mode,checkoutUrl:session.checkoutUrl})
  const options=fetch.mock.calls[0][1];expect(options.body).toBe(JSON.stringify(request));expect(options.headers['Idempotency-Key']).toBe('stable-idempotency-key');expect(options.headers.Authorization).toBe('Bearer izp_test_sk_example');expect(options.signal).toBeInstanceOf(AbortSignal)
  expect(fetch.mock.calls[1][1].body).toBe(options.body)
 })
 it('compare la réponse au JSON initial même si l’objet appelant est modifié pendant le réseau',async()=>{
  let release:(response:Response)=>void=()=>{}
  const fetch=vi.fn(()=>new Promise<Response>(resolve=>{release=resolve}));vi.stubGlobal('fetch',fetch);vi.stubEnv('MONERIZ_TEST_SECRET_KEY','izp_test_sk_example')
  const mutable={...request,metadata:{...request.metadata}}
  const pending=createMonerizSession('test','stable-idempotency-key',mutable)
  mutable.amount=12345;mutable.metadata.orderId='changed'
  release(new Response(JSON.stringify(session),{status:201}))
  expect(await pending).toMatchObject({amount:5000,metadata:{orderId:'intent-1'}})
 })
 it.each([{mode:'live'},{amount:4000},{currency:'EUR'},{reference:'other'},{metadata:{...request.metadata,orderId:'other'}},{metadata:{...request.metadata,organizationId:'other'}},{id:'pay_wrong'},{integrationMode:'iframe'},{checkoutUrl:'https://moneriz.com.evil.test/payer/token'},{checkoutUrl:'http://checkout.moneriz.com/payer/token'},{checkoutUrl:'https://user:password@checkout.moneriz.com/payer/token'},{embedUrl:'https://evil.test/integrer/token'}])('refuse une réponse incohérente %j',async patch=>{
  const fetch=mockResponse({...session,...patch},201)
  await expect(createMonerizSession('test','stable-idempotency-key',request)).rejects.toMatchObject({code:'CHECKOUT_RESULT_UNKNOWN',status:503,definiteFailure:false});expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('refuse les clés et montants locaux invalides sans appeler le réseau',async()=>{
  const fetch=mockResponse(session,201)
  await expect(createMonerizSession('test','short',request)).rejects.toMatchObject({definiteFailure:true})
  await expect(createMonerizSession('test','stable-idempotency-key',{...request,amount:1.5})).rejects.toMatchObject({definiteFailure:true});expect(fetch).not.toHaveBeenCalled()
 })
 it('conserve les codes prestataire sans présenter les 5xx comme refus certains',async()=>{
  const fetch=mockResponse({error:{code:'VALIDATION_ERROR',param:'amount'}},400)
  await expect(createMonerizSession('test','stable-idempotency-key',request)).rejects.toMatchObject({code:'VALIDATION_ERROR',status:400,definiteFailure:true})
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({error:{code:'KYB_REQUIRED'}}),{status:403}))
  await expect(createMonerizSession('test','stable-idempotency-key',request)).rejects.toMatchObject({code:'KYB_REQUIRED',status:503,definiteFailure:false})
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({error:{code:'PROVIDER_DOWN'}}),{status:503,headers:{'Retry-After':'30'}}))
  await expect(createMonerizSession('test','stable-idempotency-key',request)).rejects.toMatchObject({code:'PROVIDER_DOWN',status:503,retryAfter:30,definiteFailure:false})
 })
 it('garde réseau et JSON illisible incertains sans retry',async()=>{
  const fetch=mockResponse(session);fetch.mockRejectedValueOnce(new Error('timeout'))
  await expect(createMonerizSession('test','stable-idempotency-key',request)).rejects.toMatchObject({code:'CHECKOUT_RESULT_UNKNOWN',definiteFailure:false})
  fetch.mockResolvedValueOnce(new Response('invalid json',{status:201}))
  await expect(createMonerizSession('test','stable-idempotency-key',request)).rejects.toMatchObject({code:'CHECKOUT_RESULT_UNKNOWN',definiteFailure:false});expect(fetch).toHaveBeenCalledTimes(2)
 })
 it('relit uniquement les routes documentées et valide mode et identifiant',async()=>{
  const fetch=mockResponse(session)
  expect(await readMonerizSession('test','cs_test123')).toMatchObject({id:'cs_test123',status:'open',paymentId:null})
  expect(fetch.mock.calls[0][0]).toBe('https://api.moneriz.com/v1/checkout-sessions/cs_test123')
  fetch.mockResolvedValueOnce(new Response(JSON.stringify(payment)))
  expect(await readMonerizPayment('test','pay_test123')).toEqual(payment)
  expect(fetch.mock.calls[1][0]).toBe('https://api.moneriz.com/v1/payments/pay_test123')
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({...payment,mode:'live'})))
  await expect(readMonerizPayment('test','pay_test123')).rejects.toMatchObject({definiteFailure:false})
  await expect(readMonerizPayment('test','pay_../path')).rejects.toThrow(MonerizError)
 })
})
