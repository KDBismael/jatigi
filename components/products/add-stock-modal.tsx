'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockLotSchema, type StockLotInput } from '@/lib/schemas/stock-lot.schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface AddStockModalProps {
  productName: string
  productId: string
  salePrice?: number
  onSuccess: (newQuantity: number) => void
  onClose: () => void
}

export function AddStockModal({ productName, productId, salePrice = 0, onSuccess, onClose }: AddStockModalProps) {
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
      total_purchase: 0,
      total_transport: 0,
      total_packaging: 0,
      sale_price: salePrice || undefined,
    },
  })

  const watched = watch()
  const qty = Number(watched.quantity_received) || 1
  const totalCost = (Number(watched.total_purchase) || 0)
    + (Number(watched.total_transport) || 0)
    + (Number(watched.total_packaging) || 0)
  const unitCost = totalCost / qty
  const lotSalePrice = Number(watched.sale_price) || 0
  const margin = lotSalePrice - unitCost
  const totalProfit = margin * qty

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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Ajouter un stock</h2>
          <p className="text-sm text-gray-500 mt-0.5">{productName}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">

          {/* Étape 1 : quantité */}
          <Input
            label="Quantité reçue"
            type="number"
            min={1}
            placeholder="Ex : 12"
            error={errors.quantity_received?.message}
            {...register('quantity_received')}
          />

          {/* Étape 2 : coûts */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Montant payé au fournisseur (FCFA)"
              type="number"
              min={0}
              placeholder="Ex : 15 000"
              error={errors.total_purchase?.message}
              {...register('total_purchase')}
            />
            <Input
              label="Transport (FCFA)"
              type="number"
              min={0}
              placeholder="Ex : 2 000"
              error={errors.total_transport?.message}
              {...register('total_transport')}
            />
            <Input
              label="Emballage (FCFA)"
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
              <p className="text-base font-bold text-gray-800 mt-0.5">{formatCurrency(unitCost)}</p>
            </div>
            <div className={`p-3 rounded-lg border-2 ${margin >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <p className="text-xs text-gray-500">Marge / unité</p>
              <p className={`text-base font-bold mt-0.5 ${margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(margin)}
              </p>
            </div>
            <div className={`p-3 rounded-lg border-2 ${totalProfit >= 0 ? 'border-indigo-200 bg-indigo-50' : 'border-red-200 bg-red-50'}`}>
              <p className="text-xs text-gray-500">Bénéfice total estimé</p>
              <p className={`text-base font-bold mt-0.5 ${totalProfit >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                {formatCurrency(totalProfit)}
              </p>
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {serverError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
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
