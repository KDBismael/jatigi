export interface DeliveryDriver {
  id: string
  organization_id: string
  name: string
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DeliveryDriverSummary extends DeliveryDriver {
  packages_assigned: number
  packages_in_progress: number
  packages_delivered: number
  packages_cancelled: number
  success_rate: number
  amount_collected: number
  amount_remitted: number
  amount_due: number
}
