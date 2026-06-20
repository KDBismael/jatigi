import { describe, it, expect } from 'vitest'
import { computeLotUnitCost, allocateFifo } from '../lot-allocation'

// ---------------------------------------------------------------------------
// computeLotUnitCost
// ---------------------------------------------------------------------------

describe('computeLotUnitCost', () => {
  it('type=unit : le coût d\'import = import_cost_raw, total = somme des trois composantes', () => {
    const result = computeLotUnitCost({
      purchase_cost: 1000,
      import_cost_type: 'unit',
      import_cost_raw: 200,
      import_batch_size: null,
      packaging_cost: 150,
    })
    expect(result).toBe(1350) // 1000 + 200 + 150
  })

  it('type=lot : import_cost = import_cost_raw / import_batch_size', () => {
    const result = computeLotUnitCost({
      purchase_cost: 1000,
      import_cost_type: 'lot',
      import_cost_raw: 50_000,
      import_batch_size: 100,
      packaging_cost: 150,
    })
    expect(result).toBe(1650) // 1000 + 500 + 150
  })

  it('type=carton : import_cost = import_cost_raw / import_batch_size', () => {
    const result = computeLotUnitCost({
      purchase_cost: 800,
      import_cost_type: 'carton',
      import_cost_raw: 20_000,
      import_batch_size: 50,
      packaging_cost: 100,
    })
    expect(result).toBe(1300) // 800 + 400 + 100
  })

  it('type=container : import_cost = import_cost_raw / import_batch_size', () => {
    const result = computeLotUnitCost({
      purchase_cost: 1200,
      import_cost_type: 'container',
      import_cost_raw: 200_000,
      import_batch_size: 400,
      packaging_cost: 50,
    })
    expect(result).toBe(1750) // 1200 + 500 + 50
  })

  it('tous les coûts à zéro → total = 0', () => {
    const result = computeLotUnitCost({
      purchase_cost: 0,
      import_cost_type: 'unit',
      import_cost_raw: 0,
      import_batch_size: null,
      packaging_cost: 0,
    })
    expect(result).toBe(0)
  })

  it('type=unit avec import_batch_size=null : pas de division, utilise import_cost_raw directement', () => {
    const result = computeLotUnitCost({
      purchase_cost: 500,
      import_cost_type: 'unit',
      import_cost_raw: 100,
      import_batch_size: null,
      packaging_cost: 0,
    })
    expect(result).toBe(600) // pas de division par null
  })
})

// ---------------------------------------------------------------------------
// allocateFifo
// ---------------------------------------------------------------------------

// Helper: crée un lot simple (received_at est croissant par index par défaut)
function makeLot(
  id: string,
  quantity_available: number,
  unit_cost: number,
  received_at = `2024-01-0${id}T00:00:00Z`,
) {
  return { id, quantity_available, unit_cost, received_at }
}

describe('allocateFifo', () => {
  // --- Lot unique ---

  it('lot unique, consommation partielle : alloue la quantité demandée depuis le seul lot', () => {
    const lots = [makeLot('A', 100, 1000, '2024-01-01T00:00:00Z')]
    const result = allocateFifo(lots, 80)

    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0]).toEqual({ lot_id: 'A', quantity: 80, unit_cost: 1000 })
    expect(result.weightedUnitCost).toBe(1000)
  })

  it('lot unique, consommation exacte : épuise le lot complètement', () => {
    const lots = [makeLot('A', 100, 1000, '2024-01-01T00:00:00Z')]
    const result = allocateFifo(lots, 100)

    expect(result.allocations[0].quantity).toBe(100)
    expect(result.weightedUnitCost).toBe(1000)
  })

  // --- Multi-lots, pas de changement de lot ---

  it('multi-lots, premier lot suffisant : ne touche pas au second lot', () => {
    const lots = [
      makeLot('A', 100, 1000, '2024-01-01T00:00:00Z'),
      makeLot('B', 200, 1200, '2024-01-02T00:00:00Z'),
    ]
    const result = allocateFifo(lots, 60)

    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0]).toEqual({ lot_id: 'A', quantity: 60, unit_cost: 1000 })
    expect(result.weightedUnitCost).toBe(1000)
  })

  // --- Multi-lots, croisement de frontière ---

  it('multi-lots, chevauchement de frontière : 30 du lot A + 20 du lot B pour 50 unités', () => {
    const lots = [
      makeLot('A', 30, 1000, '2024-01-01T00:00:00Z'),
      makeLot('B', 100, 1200, '2024-01-02T00:00:00Z'),
    ]
    const result = allocateFifo(lots, 50)

    expect(result.allocations).toHaveLength(2)
    expect(result.allocations[0]).toEqual({ lot_id: 'A', quantity: 30, unit_cost: 1000 })
    expect(result.allocations[1]).toEqual({ lot_id: 'B', quantity: 20, unit_cost: 1200 })

    // Coût moyen pondéré = (30×1000 + 20×1200) / 50 = 54 000 / 50 = 1080
    expect(result.weightedUnitCost).toBe(1080)
  })

  it('multi-lots, épuisement exact de tous les lots : 10+20+30 = 60', () => {
    const lots = [
      makeLot('A', 10, 1000, '2024-01-01T00:00:00Z'),
      makeLot('B', 20, 1100, '2024-01-02T00:00:00Z'),
      makeLot('C', 30, 1200, '2024-01-03T00:00:00Z'),
    ]
    const result = allocateFifo(lots, 60)

    expect(result.allocations).toHaveLength(3)
    expect(result.allocations[0].quantity).toBe(10)
    expect(result.allocations[1].quantity).toBe(20)
    expect(result.allocations[2].quantity).toBe(30)

    // (10×1000 + 20×1100 + 30×1200) / 60 = 68 000 / 60 ≈ 1133.33
    const expected = (10 * 1000 + 20 * 1100 + 30 * 1200) / 60
    expect(result.weightedUnitCost).toBeCloseTo(expected, 4)
  })

  it('multi-lots, chevauchement sur 3 lots : 20+30+30 pour 80 unités', () => {
    const lots = [
      makeLot('A', 20, 1000, '2024-01-01T00:00:00Z'),
      makeLot('B', 30, 1100, '2024-01-02T00:00:00Z'),
      makeLot('C', 50, 1200, '2024-01-03T00:00:00Z'),
    ]
    const result = allocateFifo(lots, 80)

    expect(result.allocations).toHaveLength(3)
    expect(result.allocations[2].quantity).toBe(30) // seulement 30 du lot C

    const expected = (20 * 1000 + 30 * 1100 + 30 * 1200) / 80
    expect(result.weightedUnitCost).toBeCloseTo(expected, 4)
  })

  // --- Lots épuisés (quantity_available = 0) ---

  it('les lots avec quantity_available=0 sont ignorés', () => {
    const lots = [
      makeLot('A', 0, 1000, '2024-01-01T00:00:00Z'), // épuisé
      makeLot('B', 50, 1200, '2024-01-02T00:00:00Z'),
    ]
    const result = allocateFifo(lots, 10)

    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0].lot_id).toBe('B')
    expect(result.weightedUnitCost).toBe(1200)
  })

  // --- Stock insuffisant ---

  it('stock insuffisant : lève une erreur INSUFFICIENT_STOCK', () => {
    const lots = [makeLot('A', 50, 1000, '2024-01-01T00:00:00Z')]
    expect(() => allocateFifo(lots, 80)).toThrow('INSUFFICIENT_STOCK')
  })

  it('aucun lot disponible : lève une erreur INSUFFICIENT_STOCK', () => {
    expect(() => allocateFifo([], 10)).toThrow('INSUFFICIENT_STOCK')
  })

  it('tous les lots à zéro : lève une erreur INSUFFICIENT_STOCK', () => {
    const lots = [
      makeLot('A', 0, 1000, '2024-01-01T00:00:00Z'),
      makeLot('B', 0, 1200, '2024-01-02T00:00:00Z'),
    ]
    expect(() => allocateFifo(lots, 1)).toThrow('INSUFFICIENT_STOCK')
  })

  // --- Ordre FIFO (received_at) ---

  it('FIFO : le lot le plus ancien (received_at plus tôt) est consommé en premier, peu importe l\'ordre du tableau', () => {
    // Tableau dans l'ordre inverse : B avant A, mais A est plus ancien
    const lots = [
      makeLot('B', 50, 1200, '2024-01-02T00:00:00Z'),
      makeLot('A', 50, 1000, '2024-01-01T00:00:00Z'),
    ]
    const result = allocateFifo(lots, 30)

    expect(result.allocations[0].lot_id).toBe('A') // A est plus ancien
    expect(result.weightedUnitCost).toBe(1000)
  })

  it('FIFO avec tiebreaker : même received_at → trié par id ASC', () => {
    const sameDate = '2024-01-01T00:00:00Z'
    const lots = [
      makeLot('Z', 50, 1300, sameDate),
      makeLot('A', 50, 1000, sameDate),
      makeLot('M', 50, 1200, sameDate),
    ]
    const result = allocateFifo(lots, 10)

    // 'A' < 'M' < 'Z' alphabétiquement → A en premier
    expect(result.allocations[0].lot_id).toBe('A')
  })

  // --- Coût moyen pondéré ---

  it('coût moyen pondéré correct lors d\'un chevauchement', () => {
    const lots = [
      makeLot('A', 40, 800, '2024-01-01T00:00:00Z'),
      makeLot('B', 60, 1200, '2024-01-02T00:00:00Z'),
    ]
    const result = allocateFifo(lots, 100)

    const expected = (40 * 800 + 60 * 1200) / 100 // = 1040
    expect(result.weightedUnitCost).toBe(expected)
  })

  // --- Structure des allocations ---

  it('chaque entrée d\'allocation contient lot_id, quantity et unit_cost corrects', () => {
    const lots = [
      makeLot('LOT-1', 25, 1500, '2024-01-01T00:00:00Z'),
      makeLot('LOT-2', 25, 2000, '2024-01-02T00:00:00Z'),
    ]
    const result = allocateFifo(lots, 50)

    expect(result.allocations[0]).toMatchObject({ lot_id: 'LOT-1', quantity: 25, unit_cost: 1500 })
    expect(result.allocations[1]).toMatchObject({ lot_id: 'LOT-2', quantity: 25, unit_cost: 2000 })
  })
})
