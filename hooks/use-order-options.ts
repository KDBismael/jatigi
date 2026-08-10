'use client'
import { useEffect, useState } from 'react'

export interface SellerOption { id: string; full_name: string; person_type?: 'account' | 'internal' | 'external'; is_active?: boolean }
export interface LiveOption { id: string; name: string | null; session_date: string; slot: 'morning' | 'afternoon' | 'evening' }

export function useOrderOptions() {
  const [sellers, setSellers] = useState<SellerOption[]>([])
  const [lives, setLives] = useState<LiveOption[]>([])
  useEffect(() => { void fetch('/api/order-options').then(r => r.json()).then(data => { setSellers(data.sellers ?? []); setLives(data.lives ?? []) }) }, [])
  return { sellers, lives }
}
