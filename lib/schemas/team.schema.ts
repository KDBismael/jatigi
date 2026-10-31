import { ROLES } from '@/lib/constants'
import { z } from 'zod'
import { passwordSchema } from './auth.schema'

export const inviteEmployeeSchema = z.object({
  email: z.string().email('Email invalide'),
  full_name: z.string().min(1, 'Nom requis').max(100),
  role: z.enum(ROLES),
  password: passwordSchema,
})

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>
