import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatISODate, getPeriodDates } from '../date-periods'

// ---------------------------------------------------------------------------
// Pin time to 2025-03-15 (Saturday, mid-month, non-edge year)
// ---------------------------------------------------------------------------
const REF_DATE = new Date('2025-03-15T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(REF_DATE)
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// formatISODate
// ---------------------------------------------------------------------------

describe('formatISODate', () => {
  it('retourne une chaîne au format YYYY-MM-DD', () => {
    expect(formatISODate(new Date('2025-03-15'))).toBe('2025-03-15')
  })

  it('complète le mois et le jour avec un zéro (ex: 5 jan → 2025-01-05)', () => {
    expect(formatISODate(new Date('2025-01-05'))).toBe('2025-01-05')
  })
})

// ---------------------------------------------------------------------------
// getPeriodDates
// ---------------------------------------------------------------------------

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

describe('getPeriodDates', () => {
  it('today → dateFrom = dateTo = date d\'aujourd\'hui', () => {
    const r = getPeriodDates('today')
    expect(r.dateFrom).toBe('2025-03-15')
    expect(r.dateTo).toBe('2025-03-15')
  })

  it('yesterday → dateFrom = dateTo = date d\'hier', () => {
    const r = getPeriodDates('yesterday')
    expect(r.dateFrom).toBe('2025-03-14')
    expect(r.dateTo).toBe('2025-03-14')
  })

  it('last7d → dateFrom = 7 jours avant aujourd\'hui, dateTo = aujourd\'hui', () => {
    const r = getPeriodDates('last7d')
    expect(r.dateFrom).toBe('2025-03-08')
    expect(r.dateTo).toBe('2025-03-15')
  })

  it('last30d → dateFrom = 30 jours avant aujourd\'hui, dateTo = aujourd\'hui', () => {
    const r = getPeriodDates('last30d')
    expect(r.dateFrom).toBe('2025-02-13')
    expect(r.dateTo).toBe('2025-03-15')
  })

  it('thisMonth → dateFrom = premier jour du mois, dateTo = aujourd\'hui', () => {
    const r = getPeriodDates('thisMonth')
    expect(r.dateFrom).toBe('2025-03-01')
    expect(r.dateTo).toBe('2025-03-15')
  })

  it('lastMonth → dateFrom = premier jour du mois précédent, dateTo = dernier jour du mois précédent', () => {
    // Fév 2025 : 28 jours (année non bissextile)
    const r = getPeriodDates('lastMonth')
    expect(r.dateFrom).toBe('2025-02-01')
    expect(r.dateTo).toBe('2025-02-28')
  })

  it('lastMonth en janvier → revient à décembre de l\'année précédente', () => {
    // Changer la date de référence à janvier 2025
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'))
    const r = getPeriodDates('lastMonth')
    expect(r.dateFrom).toBe('2024-12-01')
    expect(r.dateTo).toBe('2024-12-31')
  })

  it('custom avec les deux dates → les retourne telles quelles', () => {
    const r = getPeriodDates('custom', '2025-01-10', '2025-01-20')
    expect(r.dateFrom).toBe('2025-01-10')
    expect(r.dateTo).toBe('2025-01-20')
  })

  it('custom sans customFrom → lève MISSING_CUSTOM_DATES', () => {
    expect(() => getPeriodDates('custom', undefined, '2025-01-20'))
      .toThrow('MISSING_CUSTOM_DATES')
  })

  it('custom sans customTo → lève MISSING_CUSTOM_DATES', () => {
    expect(() => getPeriodDates('custom', '2025-01-10', undefined))
      .toThrow('MISSING_CUSTOM_DATES')
  })

  it('tous les presets retournent des dates au format YYYY-MM-DD', () => {
    const presets = ['today', 'yesterday', 'last7d', 'last30d', 'thisMonth', 'lastMonth'] as const
    for (const preset of presets) {
      const r = getPeriodDates(preset)
      expect(r.dateFrom).toMatch(ISO_RE)
      expect(r.dateTo).toMatch(ISO_RE)
    }
  })
})
