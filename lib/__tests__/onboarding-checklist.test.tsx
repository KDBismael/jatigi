// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { OnboardingChecklist } from '@/components/onboarding/checklist'
vi.mock('@/stores/auth-store', () => ({ useAuthStore: () => ({ profile: {role:'admin'} }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('garde les étapes sautées visibles et propose la reprise', async () => {
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({completed:{product:false,driver:true,order:false},complete:false,skipped_steps:[1]})}))
 render(<OnboardingChecklist />)
 expect(await screen.findByText('1. Ajouter un produit')).toBeTruthy()
 expect(screen.getByRole('link',{name:'Reprendre la configuration'}).getAttribute('href')).toBe('/onboarding')
 expect(screen.getByText('1 / 3 étapes terminées')).toBeTruthy()
})
it('disparaît après trois créations réelles', async () => {
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({completed:{product:true,driver:true,order:true},complete:true})}))
 const view=render(<OnboardingChecklist />)
 await vi.waitFor(()=>expect(fetch).toHaveBeenCalled())
 expect(view.container.textContent).toBe('')
})
it('affiche la progression réelle et propose la première création manquante', async () => {
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({completed:{product:true,driver:true,order:false},complete:false,skipped_steps:[3]})}))
 render(<OnboardingChecklist />)
 const bar=await screen.findByRole('progressbar',{name:'Configuration de la boutique'})
 expect(bar.getAttribute('aria-valuenow')).toBe('2')
 expect(screen.getByRole('link',{name:'Créer ma première commande'}).getAttribute('href')).toBe('/orders/new')
})
