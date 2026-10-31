import { expect, it } from 'vitest'
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, internationalPhone, phoneCountry } from '@/lib/phone-countries'
import { phoneSchema } from '@/lib/schemas/phone.schema'

it('lists French-speaking African countries once each, Côte d’Ivoire by default', () => {
  const codes = PHONE_COUNTRIES.map(c => c.code)
  expect(new Set(codes).size).toBe(codes.length)
  for (const code of ['CI', 'SN', 'CM', 'BF', 'ML', 'BJ', 'TG', 'NE', 'GN', 'CD', 'CG', 'GA', 'MA', 'TN', 'DZ', 'MG']) expect(codes).toContain(code)
  expect(DEFAULT_PHONE_COUNTRY).toBe('CI')
  expect(phoneCountry('SN').dial).toBe('221')
  expect(phoneCountry('XX').code).toBe('CI')
  const names = PHONE_COUNTRIES.map(c => c.name)
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'fr')))
})

it('prefixes the dial code and keeps the leading 0 where it is part of the number', () => {
  expect(internationalPhone('CI', '07 00 00 00 00')).toBe('+225 07 00 00 00 00')
  expect(internationalPhone('SN', '77 123 45 67')).toBe('+221 77 123 45 67')
})

it('drops the national trunk 0 where the international format omits it', () => {
  expect(internationalPhone('MA', '06 12 34 56 78')).toBe('+212 6 12 34 56 78')
  expect(internationalPhone('CD', '0812345678')).toBe('+243 812345678')
})

it('keeps numbers already typed in international form and leaves an empty field empty', () => {
  expect(internationalPhone('CI', '+221 77 123 45 67')).toBe('+221 77 123 45 67')
  expect(internationalPhone('CI', '00221771234567')).toBe('+221771234567')
  expect(internationalPhone('CI', '   ')).toBe('')
})

it('produces numbers accepted by the shared phone schema', () => {
  for (const c of PHONE_COUNTRIES)
    expect(phoneSchema.safeParse(internationalPhone(c.code, '1234567')).success, c.code).toBe(true)
})
