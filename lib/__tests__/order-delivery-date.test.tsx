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
