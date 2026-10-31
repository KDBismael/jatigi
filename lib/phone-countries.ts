export interface PhoneCountry {
  code: string
  name: string
  dial: string
  /** Local numbers start with a trunk 0 that the international format drops. */
  trunkZero?: boolean
}

/** Pays d’Afrique francophone, triés par nom. */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = ([
  { code: 'DZ', name: 'Algérie', dial: '213', trunkZero: true },
  { code: 'BJ', name: 'Bénin', dial: '229' },
  { code: 'BF', name: 'Burkina Faso', dial: '226' },
  { code: 'BI', name: 'Burundi', dial: '257' },
  { code: 'CM', name: 'Cameroun', dial: '237' },
  { code: 'CF', name: 'Centrafrique', dial: '236' },
  { code: 'KM', name: 'Comores', dial: '269' },
  { code: 'CG', name: 'Congo', dial: '242' },
  { code: 'CI', name: 'Côte d’Ivoire', dial: '225' },
  { code: 'DJ', name: 'Djibouti', dial: '253' },
  { code: 'GA', name: 'Gabon', dial: '241' },
  { code: 'GN', name: 'Guinée', dial: '224' },
  { code: 'GQ', name: 'Guinée équatoriale', dial: '240' },
  { code: 'MG', name: 'Madagascar', dial: '261', trunkZero: true },
  { code: 'ML', name: 'Mali', dial: '223' },
  { code: 'MA', name: 'Maroc', dial: '212', trunkZero: true },
  { code: 'MU', name: 'Maurice', dial: '230' },
  { code: 'MR', name: 'Mauritanie', dial: '222' },
  { code: 'NE', name: 'Niger', dial: '227' },
  { code: 'CD', name: 'RD Congo', dial: '243', trunkZero: true },
  { code: 'RW', name: 'Rwanda', dial: '250', trunkZero: true },
  { code: 'SN', name: 'Sénégal', dial: '221' },
  { code: 'SC', name: 'Seychelles', dial: '248' },
  { code: 'TD', name: 'Tchad', dial: '235' },
  { code: 'TG', name: 'Togo', dial: '228' },
  { code: 'TN', name: 'Tunisie', dial: '216' },
] satisfies PhoneCountry[]).sort((a, b) => a.name.localeCompare(b.name, 'fr'))

export const DEFAULT_PHONE_COUNTRY = 'CI'

export function phoneCountry(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find(c => c.code === code) ?? PHONE_COUNTRIES.find(c => c.code === DEFAULT_PHONE_COUNTRY)!
}

/** Number as typed, prefixed with the country dial code unless already international. */
export function internationalPhone(code: string, input: string): string {
  const value = input.trim()
  if (!value) return ''
  if (value.startsWith('+')) return value
  if (value.startsWith('00')) return `+${value.slice(2)}`
  const country = phoneCountry(code)
  return `+${country.dial} ${country.trunkZero ? value.replace(/^0/, '') : value}`
}
