import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(120),
  purchase_cost: z.coerce.number().min(0, 'Doit être positif'),
  import_cost: z.coerce.number().min(0, 'Doit être positif'),
  packaging_cost: z.coerce.number().min(0, 'Doit être positif'),
  sale_price: z.coerce.number().positive('Prix de vente requis'),
  stock_quantity: z.coerce.number().int().min(0, 'Doit être positif'),
})

export type ProductInput = z.infer<typeof productSchema>
