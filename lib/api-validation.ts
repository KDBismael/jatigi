import { NextResponse } from 'next/server'
import { z } from 'zod'

// Default Zod messages (no custom message on the rule) are shown to users, so keep them French.
z.config(z.locales.fr())

/** 400 response carrying the first validation issue as one readable sentence. */
export function invalidRequest(error: z.ZodError) {
  const issue = error.issues[0]
  return NextResponse.json(
    { error: issue?.message ?? 'Informations invalides. Vérifiez le formulaire.', field: issue?.path.join('.') || undefined },
    { status: 400 },
  )
}
