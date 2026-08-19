import { z } from 'zod'

export const stockLotSchema = z.object({
  quantity_received: z.coerce.number().int().positive('La quantité doit être un entier positif'),
  total_purchase: z.coerce.number().min(0, 'Doit être positif'),
  total_transport: z.coerce.number().min(0, 'Doit être positif').default(0),
  total_packaging: z.coerce.number().min(0, 'Doit être positif').default(0),
  received_at: z.string().optional(),
})

export type StockLotInput = z.infer<typeof stockLotSchema>
