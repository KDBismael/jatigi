import { z } from 'zod'

/** Events the browser may send; anything else is dropped by /api/events. */
export const CLIENT_EVENTS = [
  'landing_view', 'cta_signup', 'cta_see_product', 'nav_login', 'faq_open', 'showcase_tab',
  'signup_view', 'login_view', 'subscription_view',
] as const

/** Events recorded by API routes after a successful write. */
export const SERVER_EVENTS = [
  'signup_completed',
  'order_created', 'order_status_changed',
  'product_created', 'stock_added',
  'driver_created', 'settlement_recorded',
  'member_invited', 'expense_created', 'checkout_started',
] as const

export type ClientEvent = (typeof CLIENT_EVENTS)[number]
export type ServerEvent = (typeof SERVER_EVENTS)[number]
export type EventProps = Record<string, string | number | boolean>

/** French labels for the admin report. */
export const EVENT_LABELS: Record<ClientEvent | ServerEvent, string> = {
  landing_view: 'Visite de la page d’accueil', cta_signup: 'Clic « Commencer »', cta_see_product: 'Clic « Voir le produit »',
  nav_login: 'Clic « Se connecter »', faq_open: 'Question de la FAQ ouverte', showcase_tab: 'Onglet de démonstration',
  signup_view: 'Page d’inscription vue', login_view: 'Page de connexion vue', subscription_view: 'Page abonnement vue',
  signup_completed: 'Boutique créée',
  order_created: 'Commande créée', order_status_changed: 'Statut de commande changé',
  product_created: 'Produit créé', stock_added: 'Stock ajouté',
  driver_created: 'Livreur ajouté', settlement_recorded: 'Versement enregistré',
  member_invited: 'Membre invité', expense_created: 'Dépense ajoutée', checkout_started: 'Paiement commencé',
}

const propValue = z.union([z.string().trim().max(80), z.number().finite(), z.boolean()])

/** Body accepted from browsers: known name, anonymous id, at most 8 short props. */
export const clientEventSchema = z.object({
  name: z.enum(CLIENT_EVENTS),
  anonymous_id: z.uuid(),
  path: z.string().max(200).optional(),
  props: z.record(z.string().regex(/^[a-z_]{1,32}$/), propValue)
    .refine(props => Object.keys(props).length <= 8, 'Trop de propriétés.')
    .optional().default({}),
})
