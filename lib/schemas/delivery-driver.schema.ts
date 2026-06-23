import { z } from 'zod'

export const deliveryDriverSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
})

export const deliverySettlementSchema = z.object({
  amount: z.coerce.number().positive('Le montant doit être positif'),
  settled_at: z.string().min(1, 'Date requise'),
  note: z.string().trim().max(240).optional().or(z.literal('')),
})

export type DeliveryDriverInput = z.infer<typeof deliveryDriverSchema>
export type DeliverySettlementInput = z.infer<typeof deliverySettlementSchema>
