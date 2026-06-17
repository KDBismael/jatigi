import { z } from 'zod'

export const inviteEmployeeSchema = z.object({
  email: z.string().email('Email invalide'),
  full_name: z.string().min(1, 'Nom requis').max(100),
  role: z.enum(['admin', 'employee']),
  password: z.string().min(6, 'Mot de passe minimum 6 caractères'),
})

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>
