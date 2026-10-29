import {NextRequest,NextResponse} from 'next/server'
import {requireOrganizationAdmin} from '@/lib/admin-context'
import {createAdminClient} from '@/services/supabase/server'
import {z} from 'zod'
const schema=z.object({name:z.string().trim().min(1).max(120),is_active:z.boolean().optional()})
export async function POST(r:NextRequest,{params}:{params:Promise<{id:string}>}){
 const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Accès refusé'},{status:403})
 const p=schema.safeParse(await r.json());if(!p.success)return NextResponse.json({error:'Nom de variante requis'},{status:400})
 const{id}=await params;const db=await createAdminClient();const {data:product}=await db.from('products').select('id').eq('id',id).eq('organization_id',a.organizationId).single()
 if(!product)return NextResponse.json({error:'Produit introuvable'},{status:404})
 const{data,error}=await db.from('product_variants').insert({...p.data,product_id:id,organization_id:a.organizationId}).select().single()
 return error?NextResponse.json({error:'Cette variante existe déjà ou ne peut pas être créée'},{status:400}):NextResponse.json(data,{status:201})
}
export async function PUT(r:NextRequest,{params}:{params:Promise<{id:string}>}){
 const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Accès refusé'},{status:403})
 const b=await r.json(),p=schema.safeParse(b),variant=z.string().uuid().safeParse(b.id)
 if(!p.success||!variant.success)return NextResponse.json({error:'Variante invalide'},{status:400})
 const{id}=await params;const db=await createAdminClient();const{data,error}=await db.from('product_variants').update(p.data).eq('id',variant.data).eq('product_id',id).eq('organization_id',a.organizationId).select().single()
 return error?NextResponse.json({error:'Modification impossible'},{status:400}):NextResponse.json(data)
}
