// @vitest-environment jsdom
import React from 'react'
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
const state=vi.hoisted(()=>({products:[],isLoading:false,error:'Impossible de charger les produits. Réessayez.',refresh:vi.fn()}))
vi.mock('@/hooks/use-products',()=>({useProducts:()=>state}))
vi.mock('@/components/products/product-table',()=>({ProductTable:()=> <p>Aucun produit. Ajoutez votre premier produit.</p>}))
import ProductsPage from '@/app/(app)/products/page'
afterEach(cleanup)
it('shows retry instead of pretending an unavailable catalogue is empty',()=>{
 render(<ProductsPage/> )
 expect(screen.getByRole('alert').textContent).toContain(state.error)
 expect(screen.queryByText('Aucun produit. Ajoutez votre premier produit.')).toBeNull()
 expect(screen.queryByText('0 actif(s) · 0 archivé(s)')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Réessayer'}))
 expect(state.refresh).toHaveBeenCalledOnce()
})
