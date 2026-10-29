import {beforeEach,describe,it,expect,vi} from 'vitest'
import {NextRequest} from 'next/server'
vi.mock('@/lib/order-context',()=>({getOrderContext:vi.fn()}))
vi.mock('@/services/billing-service',()=>({checkoutSubscription:vi.fn(),getBillingReceipt:vi.fn()}))
vi.mock('@/services/billing-receipt-pdf',()=>({generateBillingReceiptPdf:vi.fn(async()=>new Uint8Array([1,2,3]))}))
import {getOrderContext} from '@/lib/order-context'
import {checkoutSubscription,getBillingReceipt} from '@/services/billing-service'
import {POST} from '@/app/api/billing/checkout/route'
import {GET} from '@/app/api/billing/receipts/[id]/route'
const request=(body:object)=>new NextRequest('http://localhost/api/billing/checkout',{method:'POST',body:JSON.stringify(body)})
function auth(role='admin'){vi.mocked(getOrderContext).mockResolvedValue({user:{id:'owner'},profile:{role,organization_id:'own'}} as Awaited<ReturnType<typeof getOrderContext>>)}
beforeEach(()=>vi.resetAllMocks())
describe('owner billing endpoints',()=>{
 it('denies anonymous and employees before checkout',async()=>{expect((await POST(request({plan:'pro',cycle:'monthly'}))).status).toBe(401);auth('employee');expect((await POST(request({plan:'pro',cycle:'monthly'}))).status).toBe(403);expect(checkoutSubscription).not.toHaveBeenCalled()})
 it('rejects client supplied amount and organization',async()=>{auth();expect((await POST(request({plan:'pro',cycle:'monthly',amount:1,organization_id:'other'}))).status).toBe(400);expect(checkoutSubscription).not.toHaveBeenCalled()})
 it('uses only authenticated tenant and owner',async()=>{auth();vi.mocked(checkoutSubscription).mockResolvedValue({invoiceId:'invoice',checkoutUrl:null,state:'paid'});expect((await POST(request({plan:'pro',cycle:'monthly'}))).status).toBe(200);expect(checkoutSubscription).toHaveBeenCalledWith('own','owner','pro','monthly')})
 it('keeps receipts private and checks tenant ownership',async()=>{auth();vi.mocked(getBillingReceipt).mockResolvedValue(null);expect((await GET(new NextRequest('http://localhost'),{params:Promise.resolve({id:'invoice'})})).status).toBe(404);expect(getBillingReceipt).toHaveBeenCalledWith('own','owner','invoice')})
})
