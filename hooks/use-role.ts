'use client'

import { canManageDeliveries } from '@/lib/delivery-access'
import { useAuthStore } from '@/stores/auth-store'

export function useRole() {
  const profile = useAuthStore((s) => s.profile)
  return {
    role: profile?.role ?? null,
    canManageDeliveries: canManageDeliveries(profile?.role),
    isAdmin: profile?.role === 'admin',
    isEmployee: profile?.role === 'employee',
  }
}
