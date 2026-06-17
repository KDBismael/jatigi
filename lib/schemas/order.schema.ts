import { z } from 'zod'
import { CHANNELS, STATUSES } from '@/lib/constants'

export const channelEnum = z.enum(CHANNELS)
export const statusEnum = z.enum(STATUSES)

export const orderLineSchema = z.object({
  product_id: z.string().uuid('Produit requis'),
  quantity: z.coerce.number().int().positive('Quantité requise'),
})

export const orderSchema = z.object({
  client_name: z.string().min(1, 'Nom client requis').max(120),
  client_phone: z.string().optional(),
  channel: channelEnum,
  order_date: z.string().min(1, 'Date requise'),
  lines: z.array(orderLineSchema).min(1, 'Au moins un produit requis'),
})

export const orderStatusUpdateSchema = z.object({
  status: statusEnum,
})

export type OrderInput = z.infer<typeof orderSchema>
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>
