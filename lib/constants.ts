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

export const STATUSES = ['received', 'in_progress', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Reçue',
  in_progress: 'En cours',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const ROLES = ['admin', 'employee'] as const
export type Role = (typeof ROLES)[number]

export const ADMIN_ROUTES = ['/dashboard', '/products', '/analytics', '/team']
