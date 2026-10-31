// @vitest-environment jsdom
import React from 'react'
import {afterEach,expect,it,vi}from'vitest'
import{cleanup,fireEvent,render,screen}from'@testing-library/react'
import ExpensesPage from '@/app/(app)/expenses/page'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('does not present a failed expense query as an empty month and allows retry',async()=>{let fail=true;vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.startsWith('/api/expenses')?(fail?Response.json({error:'Calcul temporairement indisponible'},{status:503}):Response.json([{id:'qa',category:'internet',label:'Dépense QA',amount:2000,expense_date:'2026-10-31'}])):Response.json([])));render(<ExpensesPage/>);expect((await screen.findByRole('alert')).textContent).toContain('Calcul temporairement indisponible');expect(screen.queryByText('Aucune dépense ce mois-ci.')).toBeNull();fail=false;fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));expect(await screen.findByText('Dépense QA')).toBeTruthy();expect(screen.queryByRole('alert')).toBeNull()})
