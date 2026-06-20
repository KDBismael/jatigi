import { z } from 'zod'

export const stockLotSchema = z.object({
  quantity_received: z.coerce.number().int().positive('La quantité doit être un entier positif'),
  purchase_cost: z.coerce.number().min(0, 'Doit être positif'),
  import_cost_type: z.enum(['unit', 'carton', 'lot', 'container']).default('unit'),
  import_cost_raw: z.coerce.number().min(0, 'Doit être positif'),
  import_batch_size: z.coerce.number().int().positive('Doit être un entier positif').nullable().optional(),
  packaging_cost: z.coerce.number().min(0, 'Doit être positif'),
  received_at: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.import_cost_type !== 'unit' && !data.import_batch_size) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nombre d\'unités requis',
      path: ['import_batch_size'],
    })
  }
})

export type StockLotInput = z.infer<typeof stockLotSchema>
