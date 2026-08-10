import { z } from 'zod'

export const salesPersonSchema = z.object({
  full_name: z.string().trim().min(1, 'Nom requis').max(120),
  phone: z.string().trim().max(40).optional().nullable().or(z.literal('')),
  person_type: z.enum(['internal', 'external']).default('internal'),
  base_salary: z.coerce.number().min(0, 'Salaire invalide').default(0),
  salary_mode: z.enum(['manual', 'automatic']).default('manual'),
  hired_on: z.string().date(),
  is_active: z.boolean().optional().default(true),
})

export const salesPersonUpdateSchema = salesPersonSchema.partial().extend({
  id: z.string().uuid(),
})

export const salesPersonEvaluationSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Note minimum 1').max(5, 'Note maximum 5'),
  note: z.string().trim().max(1000).optional().nullable().or(z.literal('')),
  evaluated_on: z.string().date().optional(),
})

export type SalesPersonInput = z.infer<typeof salesPersonSchema>
export type SalesPersonUpdateInput = z.infer<typeof salesPersonUpdateSchema>
export type SalesPersonEvaluationInput = z.infer<typeof salesPersonEvaluationSchema>
