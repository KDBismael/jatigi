// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
const mocks=vi.hoisted(()=>({product:vi.fn(),driver:vi.fn(),order:vi.fn()}))
vi.mock('@/stores/auth-store',()=>({useAuthStore:()=>({profile:{role:'admin'}})}))
vi.mock('@/hooks/use-products',()=>({useProducts:()=>({products:[],create:mocks.product})}))
vi.mock('@/hooks/use-delivery-drivers',()=>({useDeliveryDrivers:()=>({drivers:[],create:mocks.driver})}))
vi.mock('@/hooks/use-orders',()=>({useOrders:()=>({create:mocks.order})}))
vi.mock('@/hooks/use-order-options',()=>({useOrderOptions:()=>({sellers:[],lives:[]})}))
vi.mock('@/components/products/product-form',()=>({ProductForm:({onSubmit}:{onSubmit:(data:unknown)=>void})=><button onClick={()=>onSubmit({name:'Produit réel'})}>Enregistrer produit réel</button>}))
vi.mock('@/components/orders/order-form',()=>({OrderForm:()=> <p>Commande réelle</p>}))
import { OnboardingWizard } from '@/components/onboarding/wizard'
afterEach(()=>{cleanup();vi.resetAllMocks();vi.unstubAllGlobals()})
function setup(){const state={completed:{product:false,driver:false,order:false},complete:false,step:1,skipped_steps:[]};const fetch=vi.fn().mockImplementation(async(_url,opts)=>({ok:true,json:async()=>opts?{...state,step:JSON.parse(opts.body).step,skipped_steps:JSON.parse(opts.body).skipped_steps??[]}:state}));vi.stubGlobal('fetch',fetch);return fetch}
it('enregistre le vrai produit puis persiste la prochaine étape',async()=>{
 const fetch=setup();render(<OnboardingWizard/>);fireEvent.click(await screen.findByText('Enregistrer produit réel'))
 await vi.waitFor(()=>expect(mocks.product).toHaveBeenCalledWith({name:'Produit réel'}))
 await vi.waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/onboarding',expect.objectContaining({method:'PATCH',body:JSON.stringify({step:2})})))
 expect(await screen.findByText('Étape 2 / 3 — Ajouter un livreur')).toBeTruthy()
})
it('permet de sauter puis reprendre une étape sans faux objet',async()=>{
 const fetch=setup();render(<OnboardingWizard/>);fireEvent.click(await screen.findByRole('button',{name:'Sauter cette étape'}))
 await vi.waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/onboarding',expect.objectContaining({body:JSON.stringify({step:2,skipped_steps:[1]})})))
 expect(mocks.product).not.toHaveBeenCalled();expect(mocks.order).not.toHaveBeenCalled()
})
