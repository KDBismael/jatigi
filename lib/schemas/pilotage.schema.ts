import { z } from 'zod'

export const expenseCategories = ['salary','rent','stock','packaging','internet','electricity','other'] as const
export const expenseSchema = z.object({
  category: z.enum(expenseCategories), label: z.string().trim().min(1).max(160),
  amount: z.coerce.number().positive(), expense_date: z.string().date(),
  receipt_url: z.string().url().optional().nullable().or(z.literal('')),
  sales_person_id: z.string().uuid().optional().nullable().or(z.literal('')),
  recurring: z.boolean().optional().default(false), day_of_month: z.coerce.number().int().min(1).max(28).optional(),
})
export const goalSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/), scope: z.enum(['global','seller','live']),
  amount: z.coerce.number().min(0), seller_id: z.string().uuid().optional().nullable(), live_session_id: z.string().uuid().optional().nullable(),
})
export const liveSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(), session_date: z.string().date(),
  slot: z.enum(['morning','afternoon','evening']), target_amount: z.coerce.number().min(0).default(0),
  status: z.enum(['planned','completed','cancelled']).default('planned'),
})
