import { z } from 'zod'

export const discountFields = {
  discount_type: z.enum(['none', 'amount', 'percent']).optional(),
  discount_value: z.coerce.number().finite().min(0).max(9999999999.99).multipleOf(0.01).optional(),
  discount_reason: z.string().trim().max(300).optional(),
}
export type DiscountInput = z.infer<z.ZodObject<typeof discountFields>>
export function validateDiscount(data: DiscountInput, ctx: z.RefinementCtx) {
  const type = data.discount_type ?? 'none'
  const value = data.discount_value ?? 0
  if (type === 'none' && value !== 0) ctx.addIssue({ code: 'custom', path: ['discount_value'], message: 'Choisissez un type de remise' })
  if (type === 'percent' && value > 100) ctx.addIssue({ code: 'custom', path: ['discount_value'], message: 'Maximum 100 %' })
  if (value > 0 && !data.discount_reason?.trim()) ctx.addIssue({ code: 'custom', path: ['discount_reason'], message: 'Le motif de la remise est obligatoire' })
}
export const discountSchema = z.object(discountFields).superRefine(validateDiscount)
export const discountUpdateSchema = z.object({
  lines: z.array(z.object({ id: z.string().uuid(), ...discountFields }).superRefine(validateDiscount)).min(1).max(200),
}).refine(data => new Set(data.lines.map(line => line.id)).size === data.lines.length, { message: 'Une ligne ne peut apparaître qu’une fois' })
export function calculateDiscount(subtotal: number, input: DiscountInput) {
  const parsed = discountSchema.parse(input)
  if (!Number.isFinite(subtotal) || subtotal < 0) throw new Error('Montant de ligne invalide')
  const value = parsed.discount_value ?? 0
  const raw = parsed.discount_type === 'percent' ? subtotal * value / 100 : parsed.discount_type === 'amount' ? value : 0
  const discountAmount = Math.round((raw + Number.EPSILON) * 100) / 100
  if (discountAmount > subtotal) throw new Error('La remise dépasse le montant de la ligne')
  return { subtotal, discountAmount, total: Math.round((subtotal - discountAmount + Number.EPSILON) * 100) / 100 }
}
