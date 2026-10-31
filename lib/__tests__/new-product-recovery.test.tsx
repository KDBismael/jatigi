// @vitest-environment jsdom
import React from 'react'
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {ProductCreationAcknowledgedError} from '@/lib/product-errors'
const mocks=vi.hoisted(()=>({create:vi.fn(),push:vi.fn()}))
vi.mock('@/hooks/use-products',()=>({useProducts:()=>({create:mocks.create})}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push})}))
vi.mock('@/components/products/product-form',()=>({ProductForm:({onSubmit}:{onSubmit:(input:object)=>Promise<void>})=><button onClick={()=>void onSubmit({})}>Enregistrer le produit</button>}))
import NewProductPage from '@/app/(app)/products/new/page'
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('removes the write form after acknowledged creation and offers catalogue recovery',async()=>{
 mocks.create.mockRejectedValue(new ProductCreationAcknowledgedError('saved'))
 render(<NewProductPage/>);fireEvent.click(screen.getByRole('button',{name:'Enregistrer le produit'}))
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Enregistrer le produit'})).toBeNull())
 expect(screen.getByRole('link',{name:'Consulter le catalogue'}).getAttribute('href')).toBe('/products')
 expect(screen.getByText(/Produit enregistré\./).textContent).not.toContain('Error:')
 expect(mocks.push).not.toHaveBeenCalled()
})
it('displays the parsed French error message without the Error prefix',async()=>{
 mocks.create.mockRejectedValue(new Error('Le catalogue est indisponible.'))
 render(<NewProductPage/>);fireEvent.click(screen.getByRole('button',{name:'Enregistrer le produit'}))
 await waitFor(()=>expect(screen.getByText('Le catalogue est indisponible.')).toBeTruthy())
 expect(screen.queryByText(/Error:/)).toBeNull()
})
