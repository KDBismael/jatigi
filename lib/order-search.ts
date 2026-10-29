interface SearchableOrder {
  client_name: string
  client_phone?: string | null
}

export function matchesOrderSearch(order: SearchableOrder, query: string): boolean {
  const search = query.trim().toLowerCase()
  if (!search || order.client_name.toLowerCase().includes(search)) return true
  if (!/^[\d\s+().\-/]+$/.test(search)) return false

  const phoneSearch = normalizePhone(search)
  return phoneSearch.length > 0 && normalizePhone(order.client_phone ?? '').includes(phoneSearch)
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('00225')) return digits.slice(5)
  if (value.trim().startsWith('+') && digits.startsWith('225')) return digits.slice(3)
  if (digits.startsWith('225') && digits.length > 10) return digits.slice(3)
  return digits
}
