export const CHANNELS = ['tiktok', 'facebook', 'instagram', 'whatsapp', 'magasin', 'other'] as const
export type Channel = (typeof CHANNELS)[number]

export const CHANNEL_LABELS: Record<Channel, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  magasin: 'Magasin physique',
  other: 'Autre',
}

export const STATUSES = ['received', 'confirmed', 'in_progress', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Reçue',
  confirmed: 'Confirmée',
  in_progress: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const PAYMENT_METHODS = ['wave', 'orange_money', 'mtn_momo', 'moov_money'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  moov_money: 'Moov Money',
}

export const ROLES = ['admin', 'employee'] as const
export type Role = (typeof ROLES)[number]

export const ADMIN_ROUTES = ['/dashboard', '/products', '/analytics', '/team']
