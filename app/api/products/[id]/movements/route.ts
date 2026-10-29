import {NextRequest,NextResponse} from 'next/server'
import {requireOrganizationAdmin} from '@/lib/admin-context'
import {createAdminClient} from '@/services/supabase/server'
export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
 const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Accès refusé'},{status:403})
 const{id}=await params;const db=await createAdminClient();const movements=[]
 for(let offset=0;;offset+=500){
  const{data,error}=await db.from('stock_movements').select('id,lot_id,order_id,quantity_delta,reason,occurred_at,reconstructed,variant:product_variants(name),recorder:profiles(full_name)').eq('product_id',id).eq('organization_id',a.organizationId).order('recorded_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+499)
  if(error)return NextResponse.json({error:'Historique indisponible'},{status:500})
  movements.push(...data??[]);if((data??[]).length<500)break
 }
 return NextResponse.json(movements)
}
