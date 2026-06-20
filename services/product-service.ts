import { createClient } from '@/services/supabase/server'
import type { Product } from '@/types/product'

type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Product[]
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error) return null
  return data as Product
}

export async function createProduct(input: ProductInsert, organizationId: string): Promise<Product> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Product
}

export async function updateProduct(id: string, input: Partial<ProductInsert>): Promise<Product> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Product
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
