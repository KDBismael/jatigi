import { Role } from '@/lib/constants'

export interface Organization {
  owner_id?: string | null
  country?: 'CI' | 'SN' | 'BF' | 'ML' | 'TG' | 'BJ'
  currency?: 'XOF'
  default_delivery_fee?: number
  onboarding_step?: number | null
  onboarding_skipped_steps?: number[]
  onboarding_started_at?: string | null
  notifications_unsubscribed_at?: string | null
  logo_path?: string | null
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: Role
  organization_id: string
  created_at: string
}
