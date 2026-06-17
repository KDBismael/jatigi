import { Role } from '@/lib/constants'

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: Role
  organization_id: string
  created_at: string
}
