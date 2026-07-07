import { z } from 'zod'
import { CHANNELS, STATUSES, PAYMENT_METHODS } from '@/lib/constants'

export const channelEnum = z.enum(CHANNELS)
export const statusEnum = z.enum(STATUSES)
export const paymentMethodEnum = z.enum(PAYMENT_METHODS)

export const orderLineSchema = z.object({
  product_id: z.string().uuid('Produit requis'),
  quantity: z.coerce.number().int().positive('Quantité requise'),
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
      message: 'Sélectionnez le moyen de paiement de la confirmation',
    })
  }
  if (method && amount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmation_amount'],
      message: 'Saisissez le montant de la confirmation',
    })
  }
}

export const orderSchema = z.object({
  client_name: z.string().min(1, 'Nom client requis').max(120),
  client_phone: z.string().optional(),
  channel: channelEnum,
  order_date: z.string().min(1, 'Date requise'),
  delivery_driver_id: z.string().uuid().optional().nullable().or(z.literal('')),
  delivery_location: z.string().max(200).optional().nullable().or(z.literal('')),
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
  delivery_driver_id: z.string().uuid().optional().nullable().or(z.literal('')),
  delivery_location: z.string().max(200).optional().nullable().or(z.literal('')),
  confirmation_amount: z.coerce.number().min(0, 'Montant invalide').optional(),
  payment_method: paymentMethodEnum.optional().nullable().or(z.literal('')),
}).superRefine(confirmationRefine)

export type OrderInput = z.infer<typeof orderSchema>
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>
export type OrderUpdate = z.infer<typeof orderUpdateSchema>
