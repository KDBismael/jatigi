'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@/lib/schemas/product.schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { computeMargin, formatCurrency } from '@/lib/utils'
import type { ImportCostType } from '@/types/product'

interface ProductFormProps {
  onSubmit: (data: ProductInput) => Promise<void>
  defaultValues?: Partial<ProductInput>
  isLoading?: boolean
  isEditing?: boolean
}

const COST_TYPE_OPTIONS: { value: ImportCostType; label: string; batchLabel: string }[] = [
  { value: 'unit',      label: 'Par unité',              batchLabel: '' },
  { value: 'carton',    label: 'Par carton',             batchLabel: 'Unités par carton' },
  { value: 'lot',       label: 'Par lot',                batchLabel: 'Unités par lot' },
  { value: 'container', label: 'Pour tout le conteneur', batchLabel: 'Nombre d\'unités total' },
]

const COST_INPUT_LABEL: Record<ImportCostType, string> = {
  unit:      'Coût par unité (FCFA)',
  carton:    'Coût par carton (FCFA)',
  lot:       'Coût par lot (FCFA)',
  container: 'Coût pour le conteneur (FCFA)',
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
      purchase_cost: 0,
      import_cost_type: 'unit',
      import_cost_raw: 0,
      import_batch_size: null,
      packaging_cost: 0,
      ...defaultValues,
    },
  })

  const watched = watch()
  const costType = watched.import_cost_type ?? 'unit'
  const isBatchType = costType !== 'unit'
  const batchOption = COST_TYPE_OPTIONS.find(o => o.value === costType)!

  const perUnitImportCost = isBatchType && watched.import_batch_size
    ? (Number(watched.import_cost_raw) || 0) / (Number(watched.import_batch_size) || 1)
    : Number(watched.import_cost_raw) || 0

  const margin = computeMargin({
    sale_price: Number(watched.sale_price) || 0,
    purchase_cost: Number(watched.purchase_cost) || 0,
    import_cost: perUnitImportCost,
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
          {!isEditing && (
            <Input
              label="Quantité en stock initiale"
              type="number"
              min={0}
              error={errors.stock_quantity?.message}
              {...register('stock_quantity')}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Coûts & Prix</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-sm font-medium text-amber-800">Coûts en lecture seule</p>
              <p className="text-xs text-amber-700 mt-1">
                Les coûts (achat, importation, emballage) sont mis à jour via le bouton
                &quot;+ Stock&quot; sur la liste des produits. Cela garantit l&apos;historique des lots.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Achat</span>
                  <p className="font-medium text-gray-900">{formatCurrency(defaultValues?.purchase_cost ?? 0)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Importation</span>
                  <p className="font-medium text-gray-900">{formatCurrency(perUnitImportCost)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Emballage</span>
                  <p className="font-medium text-gray-900">{formatCurrency(defaultValues?.packaging_cost ?? 0)}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Coût d'achat (FCFA)"
                  type="number"
                  min={0}
                  error={errors.purchase_cost?.message}
                  {...register('purchase_cost')}
                />
                <Input
                  label="Coût d'emballage (FCFA)"
                  type="number"
                  min={0}
                  error={errors.packaging_cost?.message}
                  {...register('packaging_cost')}
                />
              </div>

              <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-700">Coût d&apos;importation</p>

                <div className="flex flex-wrap gap-3">
                  {COST_TYPE_OPTIONS.map(option => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={option.value}
                        className="accent-indigo-600"
                        {...register('import_cost_type')}
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={COST_INPUT_LABEL[costType]}
                    type="number"
                    min={0}
                    error={errors.import_cost_raw?.message}
                    {...register('import_cost_raw')}
                  />
                  {isBatchType && (
                    <Input
                      label={batchOption.batchLabel}
                      type="number"
                      min={1}
                      error={errors.import_batch_size?.message}
                      {...register('import_batch_size')}
                    />
                  )}
                </div>

                {isBatchType && (
                  <p className="text-xs text-indigo-700 font-medium">
                    Coût d&apos;importation par unité : {formatCurrency(perUnitImportCost)}
                  </p>
                )}
              </div>
            </>
          )}

          <Input
            label="Prix de vente (FCFA)"
            type="number"
            min={0}
            error={errors.sale_price?.message}
            {...register('sale_price')}
          />

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
