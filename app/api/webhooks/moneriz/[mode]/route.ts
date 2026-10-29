import { parseMonerizEvent, verifyMonerizSignature } from '@/lib/billing/moneriz'
import { commitMonerizEvent } from '@/services/billing-service'
export const runtime='nodejs'
export async function POST(request:Request,{params}:{params:Promise<{mode:string}>}) {
  const {mode}=await params
  if(mode!=='test'&&mode!=='live') return new Response(null,{status:404})
  const secret=mode==='test'?process.env.MONERIZ_TEST_WEBHOOK_SECRET:process.env.MONERIZ_LIVE_WEBHOOK_SECRET
  if(!secret) return new Response(null,{status:503})
  const reader=request.body?.getReader()
  if(!reader) return new Response(null,{status:400})
  const chunks:Uint8Array[]=[];let size=0
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();return new Response(null,{status:413})}chunks.push(value)}
  const bytes=Buffer.concat(chunks),raw=bytes.toString('utf8')
  if(!verifyMonerizSignature(bytes,secret,request.headers.get('X-Moneriz-Signature'))) return new Response(null,{status:401})
  let event
  try{event=parseMonerizEvent(JSON.parse(raw))}catch{return new Response(null,{status:400})}
  if(!event) return new Response(null,{status:400})
  try{await commitMonerizEvent(mode,event);return new Response(null,{status:204})}
  catch(error){const message=error instanceof Error?error.message:'';return new Response(null,{status:/BILLING_(PAYMENT_MISMATCH|EVENT_CONFLICT|INVALID_EVENT)/.test(message)?400:503})}
}
