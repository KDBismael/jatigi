export const REPORT_PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const
export type ReportPeriod = (typeof REPORT_PERIODS)[number]
export interface ReportRange { start: string; end: string; label: string }

function parseISO(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}
function iso(date: Date) { return date.toISOString().slice(0, 10) }
function addDays(date: Date, days: number) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next }

export function abidjanToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Abidjan', year:'numeric', month:'2-digit', day:'2-digit' }).format(now)
}

export function getReportRange(period: ReportPeriod, anchor = abidjanToday()): ReportRange {
  const date = parseISO(anchor)
  const year = date.getUTCFullYear(), month = date.getUTCMonth()
  if (period === 'daily') return { start:anchor, end:anchor, label:new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'UTC'}).format(date) }
  if (period === 'weekly') {
    const isoDay = date.getUTCDay() || 7
    const start = addDays(date, 1 - isoDay), end = addDays(start, 6)
    return { start:iso(start), end:iso(end), label:`Semaine du ${iso(start)} au ${iso(end)}` }
  }
  if (period === 'monthly') {
    const start = new Date(Date.UTC(year,month,1)), end = new Date(Date.UTC(year,month+1,0))
    return { start:iso(start), end:iso(end), label:new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'}).format(start) }
  }
  if (period === 'quarterly') {
    const quarter = Math.floor(month / 3), start = new Date(Date.UTC(year,quarter*3,1)), end = new Date(Date.UTC(year,quarter*3+3,0))
    return { start:iso(start), end:iso(end), label:`T${quarter+1} ${year}` }
  }
  return { start:`${year}-01-01`, end:`${year}-12-31`, label:`Année ${year}` }
}

export function moveReportAnchor(period: ReportPeriod, anchor: string, direction: -1 | 1) {
  const date = parseISO(anchor)
  if (period === 'daily') date.setUTCDate(date.getUTCDate()+direction)
  if (period === 'weekly') date.setUTCDate(date.getUTCDate()+7*direction)
  if (period === 'monthly') date.setUTCMonth(date.getUTCMonth()+direction)
  if (period === 'quarterly') date.setUTCMonth(date.getUTCMonth()+3*direction)
  if (period === 'yearly') date.setUTCFullYear(date.getUTCFullYear()+direction)
  return iso(date)
}

export function isClosedRange(range: ReportRange, today = abidjanToday()) { return range.end < today }
