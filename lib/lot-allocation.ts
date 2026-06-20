import type { ImportCostType } from '@/types/product'

export interface LotForAllocation {
  id: string
  quantity_available: number
  unit_cost: number
  received_at: string
}

export interface LotAllocation {
  lot_id: string
  quantity: number
  unit_cost: number
}

export interface AllocationResult {
  allocations: LotAllocation[]
  weightedUnitCost: number
}

export function computeLotUnitCost(input: {
  purchase_cost: number
  import_cost_type: ImportCostType
  import_cost_raw: number
  import_batch_size: number | null
  packaging_cost: number
}): number {
  const { purchase_cost, import_cost_type, import_cost_raw, import_batch_size, packaging_cost } = input

  const import_cost =
    import_cost_type === 'unit'
      ? import_cost_raw
      : import_cost_raw / (import_batch_size ?? 1)

  return purchase_cost + import_cost + packaging_cost
}

export function allocateFifo(
  lots: LotForAllocation[],
  quantityNeeded: number,
): AllocationResult {
  // Sort: oldest received_at first; same date → id ASC (stable tiebreaker)
  const sorted = [...lots].sort((a, b) => {
    const dateDiff = a.received_at.localeCompare(b.received_at)
    if (dateDiff !== 0) return dateDiff
    return a.id.localeCompare(b.id)
  })

  const allocations: LotAllocation[] = []
  let remaining = quantityNeeded
  let totalCost = 0

  for (const lot of sorted) {
    if (remaining <= 0) break
    if (lot.quantity_available <= 0) continue

    const take = Math.min(lot.quantity_available, remaining)
    allocations.push({ lot_id: lot.id, quantity: take, unit_cost: lot.unit_cost })
    totalCost += take * lot.unit_cost
    remaining -= take
  }

  if (remaining > 0) {
    throw new Error('INSUFFICIENT_STOCK')
  }

  return {
    allocations,
    weightedUnitCost: totalCost / quantityNeeded,
  }
}
