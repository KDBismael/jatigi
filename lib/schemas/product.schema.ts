import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(120),
  sale_price: z.coerce.number().positive('Prix de vente requis'),
  stock_quantity: z.coerce.number().int().min(0, 'Doit être positif'),
  total_purchase: z.coerce.number().min(0, 'Doit être positif').default(0),
  total_transport: z.coerce.number().min(0, 'Doit être positif').default(0),
  total_packaging: z.coerce.number().min(0, 'Doit être positif').default(0),
})

export type ProductInput = z.infer<typeof productSchema>
