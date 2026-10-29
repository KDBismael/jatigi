import type { LiveSession } from '@/types/pilotage'
export function liveTransition(current: LiveSession['status'], next: LiveSession['status'], now: string) {
 if(current==='planned'&&next==='active')return {status:next,started_at:now,closed_at:null}
 if(current==='active'&&next==='completed')return {status:next,closed_at:now}
 if((current==='planned'||current==='active')&&next==='cancelled')return {status:next,closed_at:now}
 throw new Error('Transition de session invalide')
}
