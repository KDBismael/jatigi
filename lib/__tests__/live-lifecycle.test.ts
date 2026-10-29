import { expect,it } from 'vitest'
import { liveTransition } from '@/lib/live-lifecycle'
import { liveSchema } from '@/lib/schemas/pilotage.schema'
it('opens a planned session and timestamps closure',()=>{
 expect(liveSchema.safeParse({session_date:'2026-10-29',slot:'morning',status:'active'}).success).toBe(true)
 expect(liveTransition('planned','active','now')).toEqual({status:'active',started_at:'now',closed_at:null})
 expect(liveTransition('active','completed','now')).toEqual({status:'completed',closed_at:'now'})
})
it('does not reopen a closed session or complete an unopened session',()=>{
 expect(()=>liveTransition('completed','active','now')).toThrow()
 expect(()=>liveTransition('planned','completed','now')).toThrow()
})
