import {afterEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({billing:vi.fn(),repo:vi.fn(),process:vi.fn(),schedule:vi.fn()}))
vi.mock('@/services/billing-lifecycle',()=>({processBillingLifecycle:mocks.billing}))
vi.mock('@/services/notification-service',()=>({createNotificationRepository:mocks.repo,processNotificationJobs:mocks.process,scheduleActivationReminders:mocks.schedule}))
import {GET} from '@/app/api/jobs/lifecycle/route'
afterEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs()})
const request=()=>new Request('https://warko.test/api/jobs/lifecycle?dryRun=1',{headers:{Authorization:'Bearer qa-secret'}})
it('refuses missing delivery configuration before changing billing or claiming jobs',async()=>{vi.stubEnv('CRON_SECRET','qa-secret');vi.stubEnv('RESEND_API_KEY','');const r=await GET(request());expect(r.status).toBe(503);expect(mocks.billing).not.toHaveBeenCalled();expect(mocks.repo).not.toHaveBeenCalled();expect(mocks.process).not.toHaveBeenCalled()})
it('provides an authenticated readiness check without sending or modifying jobs',async()=>{for(const [key,value]of Object.entries({CRON_SECRET:'qa-secret',RESEND_API_KEY:'re_qa_secret',NOTIFICATION_FROM_EMAIL:'Warko <support@warko.test>',NOTIFICATION_UNSUBSCRIBE_SECRET:'unsubscribe-qa',APP_BASE_URL:'https://warko.test'}))vi.stubEnv(key,value);const r=await GET(request());expect(r.status).toBe(200);expect(await r.json()).toEqual({ready:true,dryRun:true});expect(mocks.billing).not.toHaveBeenCalled();expect(mocks.schedule).not.toHaveBeenCalled();expect(mocks.process).not.toHaveBeenCalled()})
