import { describe, expect, it } from 'vitest'
import { matchesOrderSearch } from '@/lib/order-search'

const orders = [
  { id: 'first', client_name: 'Awa Koné', client_phone: '07 12 34 56 78' },
  { id: 'second', client_name: 'Awa Koné', client_phone: '+225 (07) 12-34-56-78' },
  { id: 'third', client_name: 'Awa Koné', client_phone: '00225 07 12 34 56 78' },
  { id: 'other', client_name: 'Mariam', client_phone: '01 99 88 77 66' },
]

describe('matchesOrderSearch', () => {
  it.each(['0712345678', '+225 07 12 34 56 78', '00225-07-12-34-56-78', '12 34 56', '+225 07 12', '00225 07 12'])('finds all customer orders using %s', (query) => {
    expect(orders.filter((order) => matchesOrderSearch(order, query)).map((order) => order.id))
      .toEqual(['first', 'second', 'third'])
  })

  it('preserves case-insensitive name search and trims the query', () => {
    expect(orders.filter((order) => matchesOrderSearch(order, '  AWA  ')).map((order) => order.id))
      .toEqual(['first', 'second', 'third'])
  })

  it('does not turn name queries or punctuation into an empty phone match', () => {
    expect(matchesOrderSearch(orders[0], 'inconnu')).toBe(false)
    expect(matchesOrderSearch(orders[0], '---')).toBe(false)
  })

  it('handles a missing phone and an empty query', () => {
    const order = { client_name: 'Awa', client_phone: null }
    expect(matchesOrderSearch(order, '0712')).toBe(false)
    expect(matchesOrderSearch(order, 'awa')).toBe(true)
    expect(matchesOrderSearch(order, '  ')).toBe(true)
  })

  it('does not discard text from a mixed name query to match phone digits', () => {
    expect(matchesOrderSearch(orders[0], 'inconnu 0712')).toBe(false)
  })
})
