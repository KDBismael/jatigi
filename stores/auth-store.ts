'use client'

import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Profile, Organization } from '@/types/user'

interface AuthState {
  user: User | null
  profile: Profile | null
  organization: Organization | null
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setOrganization: (organization: Organization | null) => void
  isAdmin: () => boolean
  clear: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  organization: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setOrganization: (organization) => set({ organization }),
  isAdmin: () => get().profile?.role === 'admin',
  clear: () => set({ user: null, profile: null, organization: null }),
}))
