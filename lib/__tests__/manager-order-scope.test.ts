import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('@/lib/order-context',()=>({getOrderContext:vi.fn()}))
vi.mock('@/services/order-service',()=>({getOrders:vi.fn(),getOrderById:vi.fn(),createOrder:vi.fn(),updateOrder:vi.fn(),updateOrderStatus:vi.fn()}))
import { getOrderContext } from '@/lib/order-context'
import { getOrders, getOrderById, updateOrderStatus } from '@/services/order-service'
import { GET,POST } from '@/app/api/orders/route'
import { GET as detail,PUT,PATCH } from '@/app/api/orders/[id]/route'
const params={params:Promise.resolve({id:'order'})}
const req=(body={})=>new NextRequest('http://localhost/api/orders',{method:'POST',body:JSON.stringify(body)})
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getOrderContext).mockResolvedValue({profile:{role:'manager',organization_id:'org'},user:{id:'user'}} as never)})
it('manager cannot create or generally edit orders',async()=>{expect((await POST(req())).status).toBe(403);expect((await PUT(req(),params)).status).toBe(403)})
it('manager sees only delivery orders',async()=>{vi.mocked(getOrders).mockResolvedValue([{id:'a',status:'received'},{id:'b',status:'in_progress',delivery_driver_id:'driver'}] as never);expect(await (await GET()).json()).toEqual([expect.objectContaining({id:'b'})])})
it('manager cannot read or mutate an order outside delivery scope',async()=>{vi.mocked(getOrderById).mockResolvedValue({id:'a',status:'received'} as never);expect((await detail(req(),params)).status).toBe(403);expect((await PATCH(req({status:'delivered'}),params)).status).toBe(403);expect(updateOrderStatus).not.toHaveBeenCalled()})
it('manager cannot switch delivery orders to received',async()=>{vi.mocked(getOrderById).mockResolvedValue({id:'b',status:'in_progress',delivery_driver_id:'driver'} as never);expect((await PATCH(req({status:'received'}),params)).status).toBe(403)})
