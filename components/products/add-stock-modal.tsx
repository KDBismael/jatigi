'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockLotSchema, type StockLotInput } from '@/lib/schemas/stock-lot.schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { computeLotUnitCost } from '@/lib/lot-allocation'
import { formatCurrency } from '@/lib/utils'
import type { ImportCostType } from '@/types/product'

const COST_TYPE_OPTIONS: { value: ImportCostType; label: string; batchLabel: string }[] = [
  { value: 'unit',      label: 'Par unité',              batchLabel: '' },
  { value: 'carton',    label: 'Par carton',             batchLabel: 'Unités par carton' },
  { value: 'lot',       label: 'Par lot',                batchLabel: 'Unités par lot' },
  { value: 'container', label: 'Pour tout le conteneur', batchLabel: "Nombre d'unités total" },
]

const COST_INPUT_LABEL: Record<ImportCostType, string> = {
  unit:      'Coût d\'importation par unité (FCFA)',
  carton:    'Coût par carton (FCFA)',
  lot:       'Coût par lot (FCFA)',
  container: 'Coût pour le conteneur (FCFA)',
}

interface AddStockModalProps {
  productName: string
  productId: string
  onSuccess: (newQuantity: number) => void
  onClose: () => void
}

export function AddStockModal({ productName, productId, onSuccess, onClose }: AddStockModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<StockLotInput, any, StockLotInput>({
    resolver: zodResolver(stockLotSchema) as any,
    defaultValues: {
      quantity_received: undefined,
      purchase_cost: 0,
      import_cost_type: 'unit',
      import_cost_raw: 0,
      import_batch_size: null,
      packaging_cost: 0,
    },
  })

  const watched = watch()
  const costType = watched.import_cost_type ?? 'unit'
  const isBatchType = costType !== 'unit'
  const batchOption = COST_TYPE_OPTIONS.find((o) => o.value === costType)!

  const unitCostPreview = computeLotUnitCost({
    purchase_cost: Number(watched.purchase_cost) || 0,
    import_cost_type: costType,
    import_cost_raw: Number(watched.import_cost_raw) || 0,
    import_batch_size: isBatchType ? (Number(watched.import_batch_size) || null) : null,
    packaging_cost: Number(watched.packaging_cost) || 0,
  })

  async function onSubmit(data: StockLotInput) {
    setIsSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch(`/api/products/${productId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        setServerError(err.error ?? 'Erreur serveur')
        return
      }
      const lot = await res.json()
      onSuccess(lot.quantity_received)
    } catch {
      setServerError('Erreur de connexion')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Ajouter un stock — {productName}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Chaque approvisionnement crée un lot indépendant (FIFO).
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <Input
            label="Quantité reçue"
            type="number"
            min={1}
            error={errors.quantity_received?.message}
            {...register('quantity_received')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Coût d'achat unitaire (FCFA)"
              type="number"
              min={0}
              error={errors.purchase_cost?.message}
              {...register('purchase_cost')}
            />
            <Input
              label="Coût d'emballage unitaire (FCFA)"
              type="number"
              min={0}
              error={errors.packaging_cost?.message}
              {...register('packaging_cost')}
            />
          </div>

          <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-sm font-medium text-gray-700">Frais d&apos;importation</p>

            <div className="flex flex-wrap gap-3">
              {COST_TYPE_OPTIONS.map((option) => (
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
                Frais d&apos;importation par unité : {formatCurrency(
                  (Number(watched.import_cost_raw) || 0) / (Number(watched.import_batch_size) || 1)
                )}
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg border-2 border-indigo-200 bg-indigo-50">
            <p className="text-sm text-gray-600">Coût de revient unitaire de ce lot</p>
            <p className="text-2xl font-bold text-indigo-700">{formatCurrency(unitCostPreview)}</p>
          </div>

          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {serverError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer le stock'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
