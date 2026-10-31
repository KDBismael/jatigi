// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SubscriptionProvider } from '@/components/billing/subscription-provider'
import { useSubscription } from '@/hooks/use-subscription'
import { useOrders } from '@/hooks/use-orders'
import { useDeliveryDrivers } from '@/hooks/use-delivery-drivers'
import { useAuthStore } from '@/stores/auth-store'
import { useOrderStore } from '@/stores/order-store'
import type { OrderInput } from '@/lib/schemas/order.schema'
function Usage(){
 const {summary}=useSubscription();const orders=useOrders();const drivers=useDeliveryDrivers()
 return <><p>{summary ? `${summary.usage.orders} commandes, ${summary.usage.drivers} livreurs` : 'Chargement'}</p><button onClick={()=>void orders.create({} as OrderInput)}>Créer commande</button><button onClick={()=>void drivers.create({name:'QA'})}>Créer livreur</button></>
}
afterEach(()=>{cleanup();useAuthStore.getState().clear();useOrderStore.setState({orders:[]});vi.unstubAllGlobals()})
it('updates shared consumption after actual order and driver mutations without reloading',async()=>{
 useAuthStore.setState({profile:{id:'qa',organization_id:'qa-shop',role:'admin',full_name:'QA',phone:null,created_at:''},organization:{id:'qa-shop',name:'QA',created_at:''}})
 let orders=0,drivers=0
 const fetch=vi.fn(async(url:string,options?:RequestInit)=>{
  if(url==='/api/billing')return Response.json({plan:'discovery',usage:{orders,drivers},payments:[]})
  if(url==='/api/orders'&&options?.method==='POST'){orders++;return Response.json({id:'order-qa'})}
  if(url==='/api/delivery-drivers'&&options?.method==='POST'){drivers++;return Response.json({id:'driver-qa'})}
  return Response.json([])
 });vi.stubGlobal('fetch',fetch)
 render(<SubscriptionProvider><Usage/></SubscriptionProvider>)
 await screen.findByText('0 commandes, 0 livreurs')
 fireEvent.click(screen.getByRole('button',{name:'Créer commande'}))
 await waitFor(()=>expect(orders).toBe(1))
 await screen.findByText('1 commandes, 0 livreurs')
 fireEvent.click(screen.getByRole('button',{name:'Créer livreur'}))
 await screen.findByText('1 commandes, 1 livreurs')
})
