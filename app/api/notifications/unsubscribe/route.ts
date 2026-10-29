import { verifyUnsubscribeToken } from '@/services/notification-provider'
import { createAdminClient } from '@/services/supabase/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const organizationId = verifyUnsubscribeToken(token)
  if (!organizationId)
    return new Response('Lien de désinscription invalide.', { status: 400 })
  try {
    const db = await createAdminClient()
    const { error } = await db
      .from('organizations')
      .update({ notifications_unsubscribed_at: new Date().toISOString() })
      .eq('id', organizationId)
    if (error) throw error
    return new Response(
      'Vous êtes désinscrit des rappels Warko. Vos reçus de paiement restent envoyés.',
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      },
    )
  } catch {
    return new Response('Désinscription indisponible. Réessayez.', {
      status: 503,
    })
  }
}
export const POST = GET
