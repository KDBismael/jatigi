// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OrderForm } from '@/components/orders/order-form'
import { orderUpdateSchema } from '@/lib/schemas/order.schema'
import type { DeliveryDriverSummary } from '@/types/delivery-driver'
afterEach(cleanup)
describe('date du colis confié au livreur',()=>{
  it('reste indépendante de la date de création de commande',()=>{
    render(<OrderForm products={[]} drivers={[{id:'driver',name:'Ali',is_active:true} as DeliveryDriverSummary]} sellers={[]} lives={[]} onSubmit={async()=>{}} />)
    fireEvent.change(document.querySelector('input[name="order_date"]')!,{target:{value:'2026-01-01'}})
    fireEvent.change(screen.getByLabelText('Livreur assigné'),{target:{value:'driver'}})
    expect((screen.getByLabelText('Date de tournée') as HTMLInputElement).value).toBe(new Date().toISOString().slice(0,10))
  })
  it('refuse les dates de tournée impossibles au lieu de les ignorer',()=>{
    expect(orderUpdateSchema.safeParse({delivery_date:'2026-02-30'}).success).toBe(false)
    expect(orderUpdateSchema.parse({delivery_date:'2026-10-29'})).toMatchObject({delivery_date:'2026-10-29'})
  })
})
it('preselects live capture session in the real order form',()=>{
 render(<OrderForm products={[]} drivers={[]} sellers={[]} lives={[{id:'live',name:'Session',session_date:'2026-10-29',slot:'morning'}]} initialLiveSessionId="live" onSubmit={async()=>{}} />)
 expect((document.querySelector('select[name="live_session_id"]') as HTMLSelectElement).value).toBe('live')
})
it('offers real variant stock in the order selector',()=>{
 render(<OrderForm products={[{id:'p',name:'Chemise',sale_price:5000,pricing_mode:'unit',is_active:true,stock_quantity:7,variants:[{id:'v',name:'Bleu / L',stock_quantity:3,is_active:true}]} as never]} drivers={[]} sellers={[]} lives={[]} onSubmit={async()=>{}} />)
 fireEvent.change(document.querySelector('select[name="lines.0.product_id"]')!,{target:{value:'p'}})
 expect(document.querySelector('select[name="lines.0.variant_id"]')).not.toBeNull()
 expect(screen.getByText('Bleu / L · 3 disponibles')).toBeTruthy()
})
