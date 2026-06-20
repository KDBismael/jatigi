'use client'

import { useState, useCallback } from 'react'
import type { StockLot } from '@/types/stock-lot'
import type { StockLotInput } from '@/lib/schemas/stock-lot.schema'

export function useStockLots(productId: string) {
  const [lots, setLots] = useState<StockLot[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchLots = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}/lots`)
      if (res.ok) setLots(await res.json())
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  async function addLot(input: StockLotInput): Promise<StockLot> {
    const res = await fetch(`/api/products/${productId}/lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Erreur lors de l\'ajout du stock')
    }
    const lot: StockLot = await res.json()
    setLots((prev) => [...prev, lot])
    return lot
  }

  return { lots, isLoading, fetchLots, addLot }
}
