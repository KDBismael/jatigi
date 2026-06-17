'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@/lib/schemas/product.schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { computeMargin, formatCurrency } from '@/lib/utils'

interface ProductFormProps {
  onSubmit: (data: ProductInput) => Promise<void>
  defaultValues?: Partial<ProductInput>
  isLoading?: boolean
}

export function ProductForm({ onSubmit, defaultValues, isLoading }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ProductInput, any, ProductInput>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      purchase_cost: 0,
      import_cost: 0,
      packaging_cost: 0,
      ...defaultValues,
    },
  })

  const watched = watch()
  const margin = computeMargin({
    sale_price: Number(watched.sale_price) || 0,
    purchase_cost: Number(watched.purchase_cost) || 0,
    import_cost: Number(watched.import_cost) || 0,
    packaging_cost: Number(watched.packaging_cost) || 0,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Informations produit</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nom du produit"
            placeholder="Ex: Sac en cuir noir"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Quantité en stock"
            type="number"
            min={0}
            error={errors.stock_quantity?.message}
            {...register('stock_quantity')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Coûts & Prix</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Coût d'achat (FCFA)"
              type="number"
              min={0}
              error={errors.purchase_cost?.message}
              {...register('purchase_cost')}
            />
            <Input
              label="Coût d'importation (FCFA)"
              type="number"
              min={0}
              error={errors.import_cost?.message}
              {...register('import_cost')}
            />
            <Input
              label="Coût d'emballage (FCFA)"
              type="number"
              min={0}
              error={errors.packaging_cost?.message}
              {...register('packaging_cost')}
            />
            <Input
              label="Prix de vente (FCFA)"
              type="number"
              min={0}
              error={errors.sale_price?.message}
              {...register('sale_price')}
            />
          </div>

          <div
            className={`p-4 rounded-lg border-2 ${
              margin >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <p className="text-sm text-gray-600">Marge unitaire</p>
            <p className={`text-2xl font-bold ${margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(margin)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading} size="lg">
        {isLoading ? 'Enregistrement...' : 'Enregistrer le produit'}
      </Button>
    </form>
  )
}
