import { createAdminClient, createClient } from '@/services/supabase/server'
import type { Product } from '@/types/product'
import { ProductCreationAcknowledgedError } from '@/lib/product-errors'

const productSelection = '*, offers:product_offers(*), variants:product_variants(*), images:product_images(id,created_at)'

type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'is_active'>
type ProductUpdate = Partial<ProductInsert> & { is_active?: boolean }

export async function getProducts(organizationId: string): Promise<Product[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select(productSelection)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Product[]
}

/** Order lines and stock movements both mean history; counts avoid sending id lists in the URL. */
async function productHistoryCount(id: string, organizationId: string): Promise<number> {
  const supabase = await createAdminClient()
  const [lines, movements] = await Promise.all([
    supabase.from('order_lines').select('id, order:orders!inner(organization_id)', { count: 'exact', head: true })
      .eq('product_id', id).eq('order.organization_id', organizationId),
    supabase.from('stock_movements').select('id', { count: 'exact', head: true })
      .eq('product_id', id).eq('organization_id', organizationId),
  ])
  if (lines.error) throw new Error(lines.error.message)
  if (movements.error) throw new Error(movements.error.message)
  return (lines.count ?? 0) + (movements.count ?? 0)
}

export async function getProductById(id: string, organizationId: string): Promise<Product | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('products').select(productSelection).eq('id', id).eq('organization_id', organizationId).single()
  if (error) return null
  return data as Product
}

export async function createProduct(input: ProductInsert, organizationId: string): Promise<Product> {
  // Verify the exact read schema before the atomic product/initial-lot write.
  const reader = await createAdminClient()
  const { error: readError } = await reader.from('products').select(productSelection)
    .eq('organization_id', organizationId).limit(0)
  if (readError) throw new Error('Le catalogue est momentanément indisponible. Aucun produit créé. Réessayez plus tard.')
  const supabase = await createClient()
  const qty = input.stock_quantity
  const { data: id, error } = await supabase.rpc('create_product_with_initial_lot', {
    p_name: input.name,
    p_sale_price: input.sale_price,
    p_pricing_mode: input.pricing_mode,
    p_stock_quantity: qty,
    p_total_purchase: input.purchase_cost * Math.max(qty, 1),
    p_total_transport: input.import_cost * Math.max(qty, 1),
    p_total_packaging: input.packaging_cost * Math.max(qty, 1),
  })
  if (error) throw new Error(error.message)
  try {
    const product = await getProductById(id as string, organizationId)
    if (product) return product
  } catch {
    // The RPC committed: a read/network failure must never invite another write.
  }
  throw new ProductCreationAcknowledgedError(id as string)
}

export async function updateProduct(id: string, input: ProductUpdate, organizationId: string): Promise<Product> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select(productSelection)
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
