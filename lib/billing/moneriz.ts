import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

export type MonerizMode = 'test' | 'live'
export type MonerizCheckoutRequest = {
  amount: number
  currency: 'XOF'
  title: string
  country: string
  reference: string
  metadata: { orderId: string; organizationId: string }
  integrationMode: 'redirect'
  successUrl: string
  cancelUrl: string
}
export interface MonerizCheckoutSession {
  id: string
  mode: MonerizMode
  amount: number
  currency: 'XOF'
  reference: string
  metadata: Record<string, unknown>
  integrationMode: 'redirect'
  checkoutUrl: string
  embedUrl: string | null
}
export interface MonerizPayment {
  id: string
  mode: MonerizMode
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'reversed'
  amount: number
  currency: 'XOF'
  reference: string | null
  metadata: Record<string, unknown>
  paidAt?: string | null
}
export interface MonerizEvent {
  id: string
  type: string
  createdAt: string
  data: { payment?: MonerizPayment; [key: string]: unknown }
}
export class MonerizError extends Error {
  readonly code: string
  readonly status: number
  readonly retryAfter?: number
  readonly definiteFailure: boolean
  readonly param?: string
  constructor(code: string, status = 503, options: { definiteFailure?: boolean; retryAfter?: number; param?: string } = {}) {
    super(code)
    this.name = 'MonerizError'
    this.code = code
    this.status = status
    this.definiteFailure = options.definiteFailure ?? false
    this.retryAfter = options.retryAfter
    this.param = options.param
  }
}
const modeSchema = z.enum(['test', 'live'])
const amountSchema = z.number().int().min(100).max(Number.MAX_SAFE_INTEGER)
const identifier = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9_-]+$`)).max(200)
const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T/).refine(value => Number.isFinite(Date.parse(value)))
const metadataSchema = z.record(z.string(), z.unknown())
const paymentSchema = z.object({
  id: identifier('pay'), mode: modeSchema,
  status: z.enum(['pending', 'paid', 'failed', 'expired', 'reversed']),
  amount: amountSchema, currency: z.literal('XOF'), reference: z.string().nullable(),
  metadata: metadataSchema, paidAt: timestamp.nullable().optional(),
})
const eventSchema = z.object({
  id: identifier('evt'), type: z.string().min(1).max(200), createdAt: timestamp,
  data: z.object({ payment: paymentSchema.optional() }).catchall(z.unknown()),
}).refine(event => !event.type.startsWith('payment.') || event.data.payment !== undefined)
export function parseMonerizEvent(value: unknown): MonerizEvent | null {
  const parsed = eventSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
export function verifyMonerizSignature(raw: string | Uint8Array, secret: string, header: string | null, now = Date.now()): boolean {
  if (!header || !secret || !Number.isFinite(now)) return false
  const fields = new Map<string, string>()
  for (const part of header.split(',')) {
    const match = /^\s*(t|v1)=([^,]+?)\s*$/.exec(part)
    if (!match || fields.has(match[1])) return false
    fields.set(match[1], match[2])
  }
  const t = fields.get('t')
  const v1 = fields.get('v1')
  if (fields.size !== 2 || !t || !/^\d+$/.test(t) || !v1 || !/^[0-9a-f]{64}$/.test(v1)) return false
  const time = Number(t)
  if (!Number.isSafeInteger(time) || Math.abs(now - time) > 300000) return false
  const expected = createHmac('sha256', secret).update(t).update('.').update(raw).digest()
  return timingSafeEqual(expected, Buffer.from(v1, 'hex'))
}
export function getMonerizMode(): MonerizMode {
  const parsed = modeSchema.safeParse(process.env.MONERIZ_MODE || 'test')
  if (!parsed.success) throw new MonerizError('MONERIZ_MODE_INVALID')
  return parsed.data
}
export function getMonerizSecret(mode: MonerizMode): string {
  const secret = (mode === 'test' ? process.env.MONERIZ_TEST_SECRET_KEY : process.env.MONERIZ_LIVE_SECRET_KEY) || process.env.MONERIZ_SECRET_KEY
  if (!secret?.startsWith(`izp_${mode}_sk_`) || secret.length <= `izp_${mode}_sk_`.length) throw new MonerizError('CHECKOUT_NOT_CONFIGURED')
  return secret
}
function providerUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && (url.hostname === 'moneriz.com' || url.hostname.endsWith('.moneriz.com'))
  } catch { return false }
}
const sessionSchema = z.object({
  id: identifier('cs'), mode: modeSchema, amount: amountSchema, currency: z.literal('XOF'),
  reference: z.string().min(1), metadata: metadataSchema,
  integrationMode: z.literal('redirect'), checkoutUrl: z.string().refine(providerUrl),
  embedUrl: z.string().refine(providerUrl).nullable(),
})
const readSessionSchema = sessionSchema.extend({
  status: z.enum(['open', 'processing', 'complete', 'expired', 'disabled', 'reversed']),
  paymentId: identifier('pay').nullable(),
})
export type MonerizSessionState = Pick<z.infer<typeof readSessionSchema>, 'id' | 'status' | 'paymentId' | 'mode' | 'reference' | 'amount' | 'currency' | 'metadata'>
const requestSchema = z.object({
  amount: amountSchema, currency: z.literal('XOF'), title: z.string().min(2).max(100),
  country: z.enum(['SN', 'CI', 'BF', 'ML', 'TG', 'BJ']), reference: z.string().min(1).max(100),
  metadata: z.object({ orderId: z.string().min(1), organizationId: z.string().min(1) }).strict(),
  integrationMode: z.literal('redirect'), successUrl: z.string().url().max(2048), cancelUrl: z.string().url().max(2048),
}).strict()
const validationCodes = new Set(['VALIDATION_ERROR', 'EMBED_NOT_CONFIGURED', 'EMBED_ORIGIN_NOT_ALLOWED', 'EMBED_ORIGIN_INVALID', 'INSECURE_URL', 'INVALID_RETURN_URL'])
function unknownResult() { return new MonerizError('CHECKOUT_RESULT_UNKNOWN') }
async function providerRequest(mode: MonerizMode, path: string, options: { body?: string; idempotencyKey?: string } = {}): Promise<unknown> {
  const secret = getMonerizSecret(mode)
  try {
    const response = await fetch(`https://api.moneriz.com/v1/${path}`, {
      method: options.body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${secret}`, ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}) },
      ...(options.body === undefined ? {} : { body: options.body }),
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    })
    const result: unknown = await response.json()
    if (!response.ok) {
      const error = z.object({ error: z.object({ code: z.string().min(1), param: z.string().optional() }) }).safeParse(result)
      if (!error.success) throw unknownResult()
      const retry = response.headers.get('Retry-After')
      const retryAfter = retry && /^\d+$/.test(retry) && Number.isSafeInteger(Number(retry)) ? Number(retry) : undefined
      throw new MonerizError(error.data.error.code, [401, 403].includes(response.status) ? 503 : response.status, {
        definiteFailure: response.status === 400 && validationCodes.has(error.data.error.code),
        retryAfter, param: error.data.error.param,
      })
    }
    return result
  } catch (error) {
    if (error instanceof MonerizError) throw error
    throw unknownResult()
  }
}
export async function createMonerizSession(mode: MonerizMode, key: string, request: MonerizCheckoutRequest): Promise<MonerizCheckoutSession> {
  const validated = requestSchema.safeParse(request)
  if (!/^[\x21-\x7e]{16,128}$/.test(key) || !validated.success) throw new MonerizError('VALIDATION_ERROR', 400, { definiteFailure: true })
  const expected = validated.data
  const body = JSON.stringify(request)
  const result = sessionSchema.safeParse(await providerRequest(mode, 'checkout-sessions', { body, idempotencyKey: key }))
  if (!result.success) throw unknownResult()
  const session = result.data
  if (session.mode !== mode || session.amount !== expected.amount || session.currency !== expected.currency || session.reference !== expected.reference || session.metadata.orderId !== expected.metadata.orderId || session.metadata.organizationId !== expected.metadata.organizationId || session.integrationMode !== expected.integrationMode) throw unknownResult()
  return session
}
export async function readMonerizSession(mode: MonerizMode, id: string): Promise<MonerizSessionState> {
  if (!identifier('cs').safeParse(id).success) throw new MonerizError('VALIDATION_ERROR', 400, { definiteFailure: true })
  const result = readSessionSchema.safeParse(await providerRequest(mode, `checkout-sessions/${id}`))
  if (!result.success || result.data.mode !== mode || result.data.id !== id) throw unknownResult()
  const { status, paymentId, reference, amount, currency, metadata } = result.data
  return { id, mode, status, paymentId, reference, amount, currency, metadata }
}
export async function readMonerizPayment(mode: MonerizMode, id: string): Promise<MonerizPayment> {
  if (!identifier('pay').safeParse(id).success) throw new MonerizError('VALIDATION_ERROR', 400, { definiteFailure: true })
  const result = paymentSchema.safeParse(await providerRequest(mode, `payments/${id}`))
  if (!result.success || result.data.mode !== mode || result.data.id !== id) throw unknownResult()
  return result.data
}
