'use client'

import { useEffect } from 'react'
import { createClient } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile, Organization } from '@/types/user'

async function fetchMe(): Promise<{ profile: Profile | null; organization: Organization | null }> {
  const res = await fetch('/api/me')
  if (!res.ok) return { profile: null, organization: null }
  return res.json()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setOrganization, clear } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    async function loadContext() {
      const { profile, organization } = await fetchMe()
      if (profile) {
        setProfile(profile)
        setOrganization(organization)
      }
    }

    // Load on mount — /api/me uses server cookies, works regardless of browser client state
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        loadContext()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        clear()
        return
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        setUser(session.user)
        loadContext()
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setOrganization, clear])

  return <>{children}</>
}
