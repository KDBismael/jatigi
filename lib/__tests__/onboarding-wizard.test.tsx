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
 expect(await screen.findByText('Étape 2 sur 3 · Ajouter un livreur')).toBeTruthy()
})
it('permet de sauter puis reprendre une étape sans faux objet',async()=>{
 const fetch=setup();render(<OnboardingWizard/>);fireEvent.click(await screen.findByRole('button',{name:'Sauter cette étape'}))
 await vi.waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/onboarding',expect.objectContaining({body:JSON.stringify({step:2,skipped_steps:[1]})})))
 expect(mocks.product).not.toHaveBeenCalled();expect(mocks.order).not.toHaveBeenCalled()
})
it('shows a recoverable error instead of pretending it is still loading',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:'indisponible'},{status:503})));render(<OnboardingWizard/>);await screen.findByRole('alert');expect(screen.queryByText('Chargement de la configuration...')).toBeNull();expect(screen.getByRole('button',{name:'Réessayer'})).toBeTruthy();expect(screen.getByRole('link',{name:'Contacter le support'}).getAttribute('href')).toBe('/support')})
it.each([1,2])('never recreates an element when saving step %s fails after creation',async(step)=>{
 mocks.product.mockResolvedValue({id:'p'});mocks.driver.mockResolvedValue({id:'d'})
 const initial={completed:{product:step===2,driver:false,order:false},complete:false,step,skipped_steps:[]}
 const fetch=vi.fn().mockImplementation(async(_url,options)=>options?Response.json({error:'offline'},{status:503}):Response.json(initial));vi.stubGlobal('fetch',fetch);render(<OnboardingWizard/>);
 if(step===1)fireEvent.click(await screen.findByText('Enregistrer produit réel'));else{fireEvent.change(await screen.findByLabelText('Nom du livreur'),{target:{value:'Koffi'}});fireEvent.click(screen.getByRole('button',{name:'Ajouter mon livreur'}))}
 await screen.findByRole('alert');expect(screen.queryByText('Enregistrer produit réel')).toBeNull();expect(screen.queryByRole('button',{name:'Ajouter mon livreur'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Reprendre la configuration'}));await vi.waitFor(()=>expect(fetch.mock.calls.filter(([,options])=>options?.method==='PATCH')).toHaveLength(2));expect(step===1?mocks.product:mocks.driver).toHaveBeenCalledOnce()
})

it('shows progression saving instead of recovery instructions while the next step is pending',async()=>{
 mocks.product.mockResolvedValue({id:'p'})
 const state={completed:{product:false,driver:false,order:false},complete:false,step:1,skipped_steps:[]}
 let finish: (value:Response)=>void = ()=>{}
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async(_url,options)=>options?new Promise<Response>(resolve=>{finish=resolve}):Response.json(state)))
 render(<OnboardingWizard/>);fireEvent.click(await screen.findByText('Enregistrer produit réel'))
 expect(await screen.findByText(/Enregistrement de la progression/ )).toBeTruthy()
 expect(screen.queryByRole('button',{name:'Reprendre la configuration'})).toBeNull()
 finish(Response.json({...state,step:2}))
 expect(await screen.findByText('Étape 2 sur 3 · Ajouter un livreur')).toBeTruthy()
})

it('refuse un téléphone livreur invalide avant création puis permet sa correction',async()=>{
 const state={completed:{product:true,driver:false,order:false},complete:false,step:2,skipped_steps:[]}
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(state)))
 render(<OnboardingWizard/>);
 fireEvent.change(await screen.findByLabelText('Nom du livreur'),{target:{value:'Koffi'}})
 const phone=screen.getByLabelText('Téléphone du livreur (optionnel)')
 fireEvent.change(phone,{target:{value:'abc'}})
 fireEvent.click(screen.getByRole('button',{name:'Ajouter mon livreur'}))
 expect(await screen.findByText(/numéro de téléphone valide/i)).toBeTruthy()
 expect(mocks.driver).not.toHaveBeenCalled()
 fireEvent.change(phone,{target:{value:'+225 07 00 00 00 00'}})
 expect(screen.queryByText(/numéro de téléphone valide/i)).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Ajouter mon livreur'}))
 await vi.waitFor(()=>expect(mocks.driver).toHaveBeenCalledWith({name:'Koffi',phone:'+225 07 00 00 00 00'}))
})
