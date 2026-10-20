import { z } from 'zod'
import { CHANNELS, STATUSES, PAYMENT_METHODS } from '@/lib/constants'
import { discountFields, validateDiscount } from '@/lib/discounts'

export const channelEnum = z.enum(CHANNELS)
export const statusEnum = z.enum(STATUSES)
export const paymentMethodEnum = z.enum(PAYMENT_METHODS)

export const orderLineSchema = z.object({
  ...discountFields,
  product_id: z.string().uuid('Produit requis'),
  pricing_type: z.enum(['unit', 'offer']).default('unit'),
  quantity: z.coerce.number().int().positive('Quantité requise').optional(),
  offer_id: z.string().uuid('Offre requise').optional().or(z.literal('')),
  offer_count: z.coerce.number().int().positive("Nombre d'offres requis").optional(),
}).superRefine((line, ctx) => {
  validateDiscount(line, ctx)
  if (line.pricing_type === 'unit' && !line.quantity) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantity'], message: 'Quantité requise' })
  }
  if (line.pricing_type === 'offer' && !line.offer_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['offer_id'], message: 'Offre requise' })
  }
  if (line.pricing_type === 'offer' && !line.offer_count) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['offer_count'], message: "Nombre d'offres requis" })
  }
})

// Confirmation amount and payment method must be provided together (both-or-neither).
const confirmationRefine = (
  data: { confirmation_amount?: number; payment_method?: string | null },
  ctx: z.RefinementCtx
) => {
  const amount = data.confirmation_amount ?? 0
  const method = data.payment_method
  if (amount > 0 && !method) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['payment_method'],
      message: 'Sélectionnez le moyen de paiement du dépôt',
    })
  }
  if (method && amount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmation_amount'],
      message: 'Saisissez un montant de dépôt ou retirez le moyen de paiement',
    })
  }
}

export const orderSchema = z.object({
  client_name: z.string().min(1, 'Nom client requis').max(120),
  client_phone: z.string().optional(),
  channel: channelEnum,
  order_date: z.string().min(1, 'Date requise'),
  seller_id: z.string().uuid('Vendeur requis'),
  live_session_id: z.string().uuid().optional().nullable().or(z.literal('')),
  delivery_driver_id: z.string().uuid().optional().nullable().or(z.literal('')),
  delivery_location: z.string().max(200).optional().nullable().or(z.literal('')),
  delivery_fee: z.coerce.number().min(0, 'Coût de livraison invalide').optional().default(0),
  confirmation_amount: z.coerce.number().min(0, 'Montant invalide').optional().default(0),
  payment_method: paymentMethodEnum.optional().nullable().or(z.literal('')),
  lines: z.array(orderLineSchema).min(1, 'Au moins un produit requis'),
}).superRefine(confirmationRefine)

export const orderStatusUpdateSchema = z.object({
  status: statusEnum,
})

export const orderUpdateSchema = z.object({
  client_name: z.string().min(1).max(120).optional(),
  client_phone: z.string().optional().nullable(),
  channel: channelEnum.optional(),
  order_date: z.string().optional(),
  seller_id: z.string().uuid().optional(),
  live_session_id: z.string().uuid().optional().nullable().or(z.literal('')),
  delivery_driver_id: z.string().uuid().optional().nullable().or(z.literal('')),
  delivery_location: z.string().max(200).optional().nullable().or(z.literal('')),
  delivery_fee: z.coerce.number().min(0, 'Coût de livraison invalide').optional(),
  confirmation_amount: z.coerce.number().min(0, 'Montant invalide').optional(),
  payment_method: paymentMethodEnum.optional().nullable().or(z.literal('')),
}).superRefine(confirmationRefine)

export type OrderInput = z.infer<typeof orderSchema>
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>
export type OrderUpdate = z.infer<typeof orderUpdateSchema>
