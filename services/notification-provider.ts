import { createHmac, timingSafeEqual } from 'node:crypto'
export const reminderDueAt = (signup: string) =>
  new Date(new Date(signup).getTime() + 24 * 60 * 60 * 1000).toISOString()
function secret() {
  const value = process.env.NOTIFICATION_UNSUBSCRIBE_SECRET
  if (!value) throw new Error('Secret de désinscription non configuré')
  return value
}
export function createUnsubscribeToken(organizationId: string) {
  const value = Buffer.from(organizationId).toString('base64url')
  return `${value}.${createHmac('sha256', secret()).update(value).digest('base64url')}`
}
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const [value, signature, ...extra] = token.split('.')
    if (!value || !signature || extra.length) return null
    const expected = createHmac('sha256', secret())
      .update(value)
      .digest('base64url')
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return null
    return Buffer.from(value, 'base64url').toString('utf8')
  } catch {
    return null
  }
}
const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  )
export function notificationMessage(
  kind: string,
  payload: Record<string, unknown>,
  baseUrl: string,
  unsubscribeToken: string,
) {
  const name = String(payload.name || 'Bonjour').split(' ')[0],
    greeting = `<p>${escapeHtml(name)},</p>`
  if (kind === 'billing_receipt')
    return {
      subject: payload.mode==='test'?'Votre reçu Warko — TEST':'Votre reçu Warko',
      html: `${greeting}${payload.mode==='test'?'<p>PAIEMENT DE TEST — aucun règlement réel.</p>':''}<p>Votre paiement ${escapeHtml(payload.plan)} de ${escapeHtml(payload.amount)} FCFA est confirmé.</p><p><a href="${baseUrl}/api/billing/receipts/${encodeURIComponent(String(payload.invoiceId))}">Consulter votre reçu PDF</a> (connexion requise)</p>`,
    }
  const content =
    kind === 'activation_day1'
      ? {
          subject: `${name}, vos livreurs attendent 😊 — Créez votre première commande.`,
          html: `<p>Retrouvez ce que chaque livreur doit vous reverser sans refaire vos comptes dans un cahier.</p><p><a href="${baseUrl}/onboarding">Créer ma première commande</a></p><p>Besoin d’aide ? Répondez à cet email.</p>`,
        }
      : kind === 'renewal_due'
        ? {
            subject: 'Votre abonnement Warko arrive à échéance',
            html: `<p>Votre plan ${escapeHtml(payload.plan)} arrive à échéance le ${escapeHtml(payload.periodEnd)}. Montant à régler : ${escapeHtml(payload.amount)} FCFA.</p><p>Un nouveau paiement confirmé est nécessaire pour renouveler votre accès.</p><a href="${baseUrl}/subscription">Renouveler mon abonnement</a>`,
          }
        : kind === 'grace_reminder'
          ? {
              subject: 'Renouvelez votre plan Warko',
              html: `<p>Votre abonnement a atteint son échéance. Renouvelez-le avant la fin du délai de grâce pour conserver vos limites. Vos données sont conservées.</p><a href="${baseUrl}/subscription">Consulter mon abonnement</a>`,
            }
          : null
  if (!content) throw new Error(`Type de notification inconnu : ${kind}`)
  return {
    subject: content.subject,
    html: `${greeting}${content.html}<p><a href="${baseUrl}/api/notifications/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}">Se désinscrire des rappels</a></p>`,
  }
}
export async function sendEmail(
  message: {
    to: string
    subject: string
    html: string
    unsubscribeUrl?: string
  },
  idempotencyKey?: string,
) {
  const key = process.env.RESEND_API_KEY,
    from = process.env.NOTIFICATION_FROM_EMAIL
  if (!key || !from) throw new Error('Envoi email non configuré')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      ...(process.env.NOTIFICATION_REPLY_TO_EMAIL
        ? { reply_to: process.env.NOTIFICATION_REPLY_TO_EMAIL }
        : {}),
      ...(message.unsubscribeUrl
        ? {
            headers: {
              'List-Unsubscribe': `<${message.unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }
        : {}),
    }),
  })
  if (!response.ok) throw new Error(`Envoi email refusé (${response.status})`)
  const result = (await response.json()) as { id?: string }
  if (!result.id) throw new Error('Confirmation email absente')
  return result.id
}
