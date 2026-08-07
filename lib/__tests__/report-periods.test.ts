import {describe,expect,it} from 'vitest'
import {getReportRange,isClosedRange,moveReportAnchor} from '@/lib/report-periods'
describe('report periods',()=>{
  it('calcule une semaine ISO lundi-dimanche',()=>expect(getReportRange('weekly','2026-08-07')).toMatchObject({start:'2026-08-03',end:'2026-08-09'}))
  it('gère janvier et année bissextile',()=>{expect(getReportRange('monthly','2024-02-10').end).toBe('2024-02-29');expect(moveReportAnchor('monthly','2025-01-15',-1)).toBe('2024-12-15')})
  it('calcule les trimestres calendaires',()=>expect(getReportRange('quarterly','2026-08-07')).toEqual({start:'2026-07-01',end:'2026-09-30',label:'T3 2026'}))
  it('identifie uniquement les périodes terminées',()=>{expect(isClosedRange({start:'2026-01-01',end:'2026-01-31',label:''},'2026-02-01')).toBe(true);expect(isClosedRange({start:'2026-02-01',end:'2026-02-28',label:''},'2026-02-10')).toBe(false)})
})
