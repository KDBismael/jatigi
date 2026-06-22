'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@/lib/schemas/product.schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface ProductFormProps {
  onSubmit: (data: ProductInput) => Promise<void>
  defaultValues?: Partial<ProductInput>
  isLoading?: boolean
  isEditing?: boolean
}

export function ProductForm({ onSubmit, defaultValues, isLoading, isEditing = false }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ProductInput, any, ProductInput>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      total_purchase: 0,
      total_transport: 0,
      total_packaging: 0,
      stock_quantity: 0,
      ...defaultValues,
    },
  })

  const watched = watch()
  const qty = Number(watched.stock_quantity) || 1
  const totalCost = (Number(watched.total_purchase) || 0)
    + (Number(watched.total_transport) || 0)
    + (Number(watched.total_packaging) || 0)
  const unitCost = totalCost / qty
  const salePrice = Number(watched.sale_price) || 0
  const margin = salePrice - unitCost
  const totalProfit = margin * qty

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Nom du produit */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Informations produit</h2>
        </CardHeader>
        <CardContent>
          <Input
            label="Nom du produit"
            placeholder="Ex: Sac en cuir noir"
            error={errors.name?.message}
            {...register('name')}
          />
        </CardContent>
      </Card>

      {/* Stock initial + prix + résultats */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Stock initial</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Étape 1 : quantité */}
            <Input
              label="Quantité reçue"
              type="number"
              min={0}
              placeholder="Ex : 12"
              error={errors.stock_quantity?.message}
              {...register('stock_quantity')}
            />

            {/* Étape 2 : coûts */}
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Montant payé au fournisseur (FCFA)"
                type="number"
                min={0}
                placeholder="Ex : 15 000"
                error={errors.total_purchase?.message}
                {...register('total_purchase')}
              />
              <Input
                label="Frais de transport (FCFA)"
                type="number"
                min={0}
                placeholder="Ex : 2 000"
                error={errors.total_transport?.message}
                {...register('total_transport')}
              />
              <Input
                label="Coût d'emballage (FCFA)"
                type="number"
                min={0}
                placeholder="Ex : 1 000"
                error={errors.total_packaging?.message}
                {...register('total_packaging')}
              />
            </div>

            {/* Étape 3 : prix de vente */}
            <Input
              label="Prix de vente unitaire (FCFA)"
              type="number"
              min={0}
              placeholder="Ex : 3 000"
              error={errors.sale_price?.message}
              {...register('sale_price')}
            />

            {/* Résultats calculés automatiquement */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500">Coût unitaire</p>
                <p className="text-lg font-bold text-gray-800 mt-0.5">{formatCurrency(unitCost)}</p>
              </div>
              <div className={`p-3 rounded-lg border-2 ${margin >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <p className="text-xs text-gray-500">Marge / unité</p>
                <p className={`text-lg font-bold mt-0.5 ${margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(margin)}
                </p>
              </div>
              <div className={`p-3 rounded-lg border-2 ${totalProfit >= 0 ? 'border-indigo-200 bg-indigo-50' : 'border-red-200 bg-red-50'}`}>
                <p className="text-xs text-gray-500">Bénéfice total estimé</p>
                <p className={`text-lg font-bold mt-0.5 ${totalProfit >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                  {formatCurrency(totalProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* En mode édition : juste le prix de vente (les coûts passent par les lots) */}
      {isEditing && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Prix de vente</h2>
          </CardHeader>
          <CardContent>
            <Input
              label="Prix de vente unitaire (FCFA)"
              type="number"
              min={0}
              error={errors.sale_price?.message}
              {...register('sale_price')}
            />
          </CardContent>
        </Card>
      )}

      <Button type="submit" disabled={isLoading} size="lg">
        {isLoading ? 'Enregistrement...' : 'Enregistrer le produit'}
      </Button>
    </form>
  )
}
