import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(120),
  pricing_mode: z.enum(['unit', 'offers', 'both']).default('unit'),
  sale_price: z.coerce.number().min(0, 'Prix invalide'),
  stock_quantity: z.coerce.number().int().min(0, 'Doit être positif'),
  total_purchase: z.coerce.number().min(0, 'Doit être positif').default(0),
  total_transport: z.coerce.number().min(0, 'Doit être positif').default(0),
  total_packaging: z.coerce.number().min(0, 'Doit être positif').default(0),
}).superRefine((data, ctx) => {
  if (data.pricing_mode !== 'offers' && data.sale_price <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sale_price'], message: 'Prix de vente unitaire requis' })
  }
})

export const productOfferSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  units_per_offer: z.coerce.number().int().positive('Quantité requise'),
  price: z.coerce.number().positive('Prix requis'),
})

export const productOfferUpdateSchema = productOfferSchema.partial().extend({ is_active: z.boolean().optional() })

export type ProductInput = z.infer<typeof productSchema>
export type ProductOfferInput = z.infer<typeof productOfferSchema>
