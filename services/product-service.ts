import { createAdminClient, createClient } from '@/services/supabase/server'
import type { Product } from '@/types/product'

type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>

export async function getProducts(organizationId: string): Promise<Product[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Product[]
}

export async function getProductById(id: string, organizationId: string): Promise<Product | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('products').select('*').eq('id', id).eq('organization_id', organizationId).single()
  if (error) return null
  return data as Product
}

export async function createProduct(input: ProductInsert, organizationId: string): Promise<Product> {
  const supabase = await createClient()
  const qty = input.stock_quantity
  const { data: id, error } = await supabase.rpc('create_product_with_initial_lot', {
    p_name: input.name,
    p_sale_price: input.sale_price,
    p_stock_quantity: qty,
    p_total_purchase: input.purchase_cost * Math.max(qty, 1),
    p_total_transport: input.import_cost * Math.max(qty, 1),
    p_total_packaging: input.packaging_cost * Math.max(qty, 1),
  })
  if (error) throw new Error(error.message)
  const product = await getProductById(id as string, organizationId)
  if (!product) throw new Error('Produit créé mais introuvable')
  return product
}

export async function updateProduct(id: string, input: Partial<ProductInsert>, organizationId: string): Promise<Product> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Product
}

export async function deleteProduct(id: string, organizationId: string): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase.from('products').delete().eq('id', id).eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
}
