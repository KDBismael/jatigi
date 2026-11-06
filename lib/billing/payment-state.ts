/** Invoice lifecycle stays pending while a failed attempt can be retried in the same session. */
export function visiblePaymentState(state:string,lastPaymentStatus?:string|null):string {
 return state==='pending'&&lastPaymentStatus==='failed'?'failed':state
}
