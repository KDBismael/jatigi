import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(120),
  purchase_cost: z.coerce.number().min(0, 'Doit être positif'),
  import_cost_type: z.enum(['unit', 'carton', 'lot', 'container']).default('unit'),
  import_cost_raw: z.coerce.number().min(0, 'Doit être positif'),
  import_batch_size: z.coerce.number().int().positive('Doit être un entier positif').nullable().optional(),
  packaging_cost: z.coerce.number().min(0, 'Doit être positif'),
  sale_price: z.coerce.number().positive('Prix de vente requis'),
  stock_quantity: z.coerce.number().int().min(0, 'Doit être positif'),
}).superRefine((data, ctx) => {
  if (data.import_cost_type !== 'unit' && !data.import_batch_size) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nombre d\'unités requis',
      path: ['import_batch_size'],
    })
  }
})

export type ProductInput = z.infer<typeof productSchema>
