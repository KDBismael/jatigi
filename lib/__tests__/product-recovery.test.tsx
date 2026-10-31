// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useProducts } from '@/hooks/use-products'
import { useProductStore } from '@/stores/product-store'
import type { ProductInput } from '@/lib/schemas/product.schema'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); useProductStore.setState({products:[],isLoading:false}) })
it('keeps cached products and exposes a retryable load error', async () => {
  const cached = {id:'cached',name:'Sac'}
  useProductStore.setState({products:[cached as never]})
  let fail = true
  vi.stubGlobal('fetch',async()=> fail ? Response.json({error:'technical schema error'},{status:500}) : Response.json([]))
  const {result}=renderHook(()=>useProducts())
  await waitFor(()=>expect(result.current.isLoading).toBe(false))
  expect(result.current.products).toEqual([cached])
  expect(result.current.error).toBe('Impossible de charger les produits. Réessayez.')
  fail=false
  await act(()=>result.current.refresh())
  expect(result.current.error).toBeNull()
  expect(result.current.products).toEqual([])
})
it('parses French API mutation errors without serializing JSON', async()=>{
  vi.stubGlobal('fetch',async(_url: string,init?:RequestInit)=>init?.method ? Response.json({error:'Le catalogue est indisponible.'},{status:503}) : Response.json([]))
  const {result}=renderHook(()=>useProducts())
  await expect(result.current.create({} as ProductInput)).rejects.toThrow('Le catalogue est indisponible.')
  await expect(result.current.create({} as ProductInput)).rejects.not.toThrow('{')
})
it('acknowledges a committed creation without adding a fake product or submitting it twice',async()=>{
  let writes=0
  vi.stubGlobal('fetch',async(_url:string,init?:RequestInit)=>{
    if(!init?.method)return Response.json([])
    writes++;return Response.json({created:true,id:'saved',message:'Produit enregistré. Consultez le catalogue avant de recommencer.'},{status:202})
  })
  const {result}=renderHook(()=>useProducts())
  await expect(result.current.create({} as ProductInput)).rejects.toThrow('Produit enregistré.')
  await expect(result.current.create({} as ProductInput)).rejects.toThrow('Produit enregistré.')
  expect(writes).toBe(1)
  expect(result.current.products).toEqual([])
})
it('keeps the duplicate guard until a successful catalogue read confirms the saved id',async()=>{
  let loaded: object[]=[]
  let writes=0
  vi.stubGlobal('fetch',async(_url:string,init?:RequestInit)=>{
    if(!init?.method)return Response.json(loaded)
    writes++;return Response.json({created:true,id:'saved'},{status:202})
  })
  const {result}=renderHook(()=>useProducts())
  await waitFor(()=>expect(result.current.isLoading).toBe(false))
  await expect(result.current.create({} as ProductInput)).rejects.toThrow('Produit enregistré.')
  await act(()=>result.current.refresh())
  await expect(result.current.create({} as ProductInput)).rejects.toThrow('Produit enregistré.')
  expect(writes).toBe(1)
  loaded=[{id:'saved'}]
  await act(()=>result.current.refresh())
  await expect(result.current.create({} as ProductInput)).rejects.toThrow('Produit enregistré.')
  expect(writes).toBe(2)
})
