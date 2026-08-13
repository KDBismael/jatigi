import { createAdminClient, createClient } from '@/services/supabase/server'
import type { Product } from '@/types/product'

type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'is_active'>
type ProductUpdate = Partial<ProductInsert> & { is_active?: boolean }

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

async function productHistoryCount(id: string, organizationId: string): Promise<number> {
  const supabase = await createAdminClient()
  const { data: lines, error: linesError } = await supabase
    .from('order_lines')
    .select('id, order:orders!inner(organization_id)')
    .eq('product_id', id)
    .eq('order.organization_id', organizationId)
  if (linesError) throw new Error(linesError.message)
  const lineIds = (lines ?? []).map((line) => line.id as string)
  if (lineIds.length === 0) return 0

  const { count, error: allocationsError } = await supabase
    .from('order_line_lots')
    .select('id', { count: 'exact', head: true })
    .in('order_line_id', lineIds)
  if (allocationsError) throw new Error(allocationsError.message)
  return lineIds.length + (count ?? 0)
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

export async function updateProduct(id: string, input: ProductUpdate, organizationId: string): Promise<Product> {
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

export async function deleteProduct(id: string, organizationId: string): Promise<{ deleted: boolean; product?: Product; message: string }> {
  const supabase = await createAdminClient()
  const product = await getProductById(id, organizationId)
  if (!product) throw new Error('Produit introuvable')

  const historyCount = await productHistoryCount(id, organizationId)
  if (historyCount > 0) {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return {
      deleted: false,
      product: data as Product,
      message: 'Ce produit a déjà un historique de commandes. Il a été archivé pour préserver les données.',
    }
  }

  const { error } = await supabase.from('products').delete().eq('id', id).eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
  return { deleted: true, message: 'Produit supprimé définitivement.' }
}
