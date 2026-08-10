import { describe, expect, it } from 'vitest'
import { salaryExpenseLabel, shouldGenerateSalaryForMonth } from '@/lib/salary-expenses'

describe('salary expenses', () => {
  it('génère un salaire automatique pour une personne active pendant le mois', () => {
    expect(shouldGenerateSalaryForMonth({
      base_salary: 150_000,
      salary_mode: 'automatic',
      hired_on: '2026-01-15',
      ended_on: null,
      is_active: true,
    }, '2026-08-01')).toBe(true)
  })

  it('ne génère pas si la personne est inactive, manuelle ou sans salaire', () => {
    expect(shouldGenerateSalaryForMonth({
      base_salary: 150_000,
      salary_mode: 'automatic',
      hired_on: '2026-01-01',
      ended_on: null,
      is_active: false,
    }, '2026-08-01')).toBe(false)
    expect(shouldGenerateSalaryForMonth({
      base_salary: 150_000,
      salary_mode: 'manual',
      hired_on: '2026-01-01',
      ended_on: null,
      is_active: true,
    }, '2026-08-01')).toBe(false)
    expect(shouldGenerateSalaryForMonth({
      base_salary: 0,
      salary_mode: 'automatic',
      hired_on: '2026-01-01',
      ended_on: null,
      is_active: true,
    }, '2026-08-01')).toBe(false)
  })

  it('respecte les dates entrée/sortie pour le mois demandé', () => {
    expect(shouldGenerateSalaryForMonth({
      base_salary: 150_000,
      salary_mode: 'automatic',
      hired_on: '2026-09-01',
      ended_on: null,
      is_active: true,
    }, '2026-08-01')).toBe(false)
    expect(shouldGenerateSalaryForMonth({
      base_salary: 150_000,
      salary_mode: 'automatic',
      hired_on: '2026-01-01',
      ended_on: '2026-07-31',
      is_active: true,
    }, '2026-08-01')).toBe(false)
  })

  it('formate le libellé de dépense salaire', () => {
    expect(salaryExpenseLabel('Yao Livraison')).toBe('Salaire · Yao Livraison')
  })
})
