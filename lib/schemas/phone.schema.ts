import { z } from 'zod'

export const phoneSchema = z.string().trim().max(30, 'Saisissez un numéro de téléphone valide.').refine(
  value => /^\+?[0-9\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 8 && value.replace(/\D/g, '').length <= 15,
  'Saisissez un numéro de téléphone valide.',
)

export const optionalPhoneSchema = z.union([z.literal(''), phoneSchema]).optional()
