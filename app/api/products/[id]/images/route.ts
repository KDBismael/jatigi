import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {requireOrganizationAdmin} from '@/lib/admin-context'
import {createAdminClient} from '@/services/supabase/server'
import {validateProductImage} from '@/lib/product-media'
export const runtime='nodejs'
export async function POST(r:NextRequest,{params}:{params:Promise<{id:string}>}){
 const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Accès refusé'},{status:403})
 const{id}=await params;const db=await createAdminClient();const{data:product}=await db.from('products').select('id').eq('id',id).eq('organization_id',a.organizationId).single()
 if(!product)return NextResponse.json({error:'Produit introuvable'},{status:404})
 const file=(await r.formData()).get('file');if(!(file instanceof File))return NextResponse.json({error:'Image requise'},{status:400})
 if(file.size>2*1024*1024)return NextResponse.json({error:'Image limitée à 2 Mo'},{status:400})
 try{
  const image=await validateProductImage(Buffer.from(await file.arrayBuffer()),file.type)
  const path=`${a.organizationId}/${id}/${randomUUID()}.${image.extension}`
  const{error:uploadError}=await db.storage.from('product-images').upload(path,image.bytes,{contentType:image.mime,upsert:false})
  if(uploadError)return NextResponse.json({error:'Envoi de l’image impossible'},{status:500})
  const{data,error}=await db.from('product_images').insert({product_id:id,organization_id:a.organizationId,storage_path:path}).select('id,created_at').single()
  if(error){await db.storage.from('product-images').remove([path]);return NextResponse.json({error:'Enregistrement impossible'},{status:500})}
  return NextResponse.json(data,{status:201})
 }catch{return NextResponse.json({error:'Image PNG ou JPEG valide requise (2 Mo maximum)'},{status:400})}
}
export async function GET(r:NextRequest,{params}:{params:Promise<{id:string}>}){
 const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Accès refusé'},{status:403})
 const{id}=await params;const db=await createAdminClient();const{data}=await db.from('product_images').select('storage_path').eq('id',r.nextUrl.searchParams.get('image')).eq('product_id',id).eq('organization_id',a.organizationId).single()
 if(!data||!data.storage_path.startsWith(`${a.organizationId}/${id}/`))return NextResponse.json({error:'Image introuvable'},{status:404})
 const{data:file,error}=await db.storage.from('product-images').download(data.storage_path)
 if(error||!file)return NextResponse.json({error:'Image introuvable'},{status:404})
 return new NextResponse(new Uint8Array(await file.arrayBuffer()),{headers:{'Content-Type':file.type,'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}})
}
export async function DELETE(r:NextRequest,{params}:{params:Promise<{id:string}>}){
 const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Accès refusé'},{status:403})
 const{id}=await params;const db=await createAdminClient();const{data}=await db.from('product_images').select('id,storage_path').eq('id',r.nextUrl.searchParams.get('image')).eq('product_id',id).eq('organization_id',a.organizationId).single()
 if(!data||!data.storage_path.startsWith(`${a.organizationId}/${id}/`))return NextResponse.json({error:'Image introuvable'},{status:404})
 const{error}=await db.storage.from('product-images').remove([data.storage_path]);if(error)return NextResponse.json({error:'Suppression impossible'},{status:500})
 const{error:deleteError}=await db.from('product_images').delete().eq('id',data.id).eq('organization_id',a.organizationId)
 return deleteError?NextResponse.json({error:'Suppression impossible'},{status:500}):NextResponse.json({success:true})
}
