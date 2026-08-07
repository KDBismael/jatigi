export function normalizeWhatsAppNumber(value?: string) { return (value ?? '').replace(/\D/g, '') }
export function supportWhatsAppUrl(value?: string) {
  const number = normalizeWhatsAppNumber(value)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent('Bonjour, j’ai besoin d’aide avec Warko.')}` : null
}
