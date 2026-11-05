import {afterEach,expect,it,vi} from 'vitest'
import {getMonerizMode,getMonerizSecret,MonerizError} from '@/lib/billing/moneriz'
import {billingErrorResponse} from '@/lib/billing/access'
afterEach(()=>vi.unstubAllEnvs())
it.each(['test\n',' test ','test\r\n'])('accepts surrounding CLI whitespace in the configured mode %j',value=>{vi.stubEnv('MONERIZ_MODE',value);expect(getMonerizMode()).toBe('test')})
it('trims pasted secret whitespace while retaining the key mode check',()=>{vi.stubEnv('MONERIZ_TEST_SECRET_KEY',' izp_test_sk_qa-example\r\n');vi.stubEnv('MONERIZ_LIVE_SECRET_KEY','izp_test_sk_wrong-mode');expect(getMonerizSecret('test')).toBe('izp_test_sk_qa-example');expect(()=>getMonerizSecret('live')).toThrow()})
it.each(['MONERIZ_MODE_INVALID','CHECKOUT_NOT_CONFIGURED'])('reports configuration failure without suggesting an existing payment %s',async code=>{const response=billingErrorResponse(new MonerizError(code));const body=await response.json();expect(response.status).toBe(503);expect(body.code).toBe(code);expect(body.error).not.toContain('pas encore confirmé');expect(body.error).toMatch(/configur|mode/i)})
it('keeps truly unknown provider outcomes uncertain',async()=>{const response=billingErrorResponse(new MonerizError('CHECKOUT_RESULT_UNKNOWN'));expect((await response.json()).error).toContain('pas encore confirmé')})
