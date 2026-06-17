'use client'

import { useAuthStore } from '@/stores/auth-store'

export function useRole() {
  const profile = useAuthStore((s) => s.profile)
  return {
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    isEmployee: profile?.role === 'employee',
  }
}
