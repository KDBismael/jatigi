import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {createHmac} from 'node:crypto'
vi.mock('@/services/billing-service',()=>({commitMonerizEvent:vi.fn()}))
import {commitMonerizEvent} from '@/services/billing-service'
import {POST} from '@/app/api/webhooks/moneriz/[mode]/route'
const body=JSON.stringify({id:'evt_unknown',type:'wallet.updated',createdAt:'2026-10-29T00:00:00Z',data:{}})
function request(raw=body,secret='secret'){const t=Date.now(),v=createHmac('sha256',secret).update(`${t}.${raw}`).digest('hex');return new Request('https://warko.test/api/webhooks/moneriz/test',{method:'POST',body:raw,headers:{'X-Moneriz-Signature':`t=${t},v1=${v}`}})}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('MONERIZ_TEST_WEBHOOK_SECRET','secret');vi.stubEnv('MONERIZ_LIVE_WEBHOOK_SECRET','live-secret')})
afterEach(()=>vi.unstubAllEnvs())
it('rejects invalid signatures and cross-mode signatures before persistence',async()=>{expect((await POST(request(body,'bad'),{params:Promise.resolve({mode:'test'})})).status).toBe(401);expect((await POST(request(),{params:Promise.resolve({mode:'live'})})).status).toBe(401);expect(commitMonerizEvent).not.toHaveBeenCalled()})
it('acknowledges signed events only after durable commit',async()=>{vi.mocked(commitMonerizEvent).mockResolvedValue('ignored');expect((await POST(request(),{params:Promise.resolve({mode:'test'})})).status).toBe(204);expect(commitMonerizEvent).toHaveBeenCalledWith('test',JSON.parse(body))})
it('requests provider retry on database failure rather than losing the event',async()=>{vi.mocked(commitMonerizEvent).mockRejectedValue(new Error('database down'));expect((await POST(request(),{params:Promise.resolve({mode:'test'})})).status).toBe(503)})
