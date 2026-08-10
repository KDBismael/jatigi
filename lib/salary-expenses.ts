import type { SalaryMode } from '@/types/sales-person'

export interface SalaryPersonForMonth {
  base_salary: number
  salary_mode: SalaryMode
  hired_on: string
  ended_on: string | null
  is_active: boolean
}

function monthEnd(monthStart: string): string {
  const [year, month] = monthStart.split('-').map(Number)
  const end = new Date(Date.UTC(year, month, 0))
  return end.toISOString().slice(0, 10)
}

export function shouldGenerateSalaryForMonth(person: SalaryPersonForMonth, monthStart: string): boolean {
  if (!person.is_active) return false
  if (person.salary_mode !== 'automatic') return false
  if (Number(person.base_salary) <= 0) return false
  if (person.hired_on > monthEnd(monthStart)) return false
  if (person.ended_on && person.ended_on < monthStart) return false
  return true
}

export function salaryExpenseLabel(fullName: string): string {
  return `Salaire · ${fullName}`
}
