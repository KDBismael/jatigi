'use client'

import { useForm, useFieldArray, useWatch, type Resolver } from 'react-hook-form'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { orderSchema, type OrderInput } from '@/lib/schemas/order.schema'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CHANNELS, CHANNEL_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { selectableOrderProducts } from '@/lib/product-archive'
import { useAuthStore } from '@/stores/auth-store'
import type { Product } from '@/types/product'
import type { DeliveryDriverSummary } from '@/types/delivery-driver'
import type { SellerOption, LiveOption } from '@/hooks/use-order-options'

interface OrderFormProps {
  onSubmit: (data: OrderInput) => Promise<void>
  products: Product[]
  drivers: DeliveryDriverSummary[]
  sellers: SellerOption[]
  lives: LiveOption[]
  isLoading?: boolean
}

const channelOptions = CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))
const paymentMethodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))

export function OrderForm({ onSubmit, products, drivers, sellers, lives, isLoading }: OrderFormProps) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const profile = useAuthStore((s) => s.profile)
  const activeProducts = selectableOrderProducts(products)
  const productOptions = activeProducts.map((p) => ({
    value: p.id,
    label: isAdmin ? `${p.name} (stock: ${p.stock_quantity})` : p.name,
  }))

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema) as unknown as Resolver<OrderInput>,
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      seller_id: profile?.id ?? '',
      live_session_id: '',
      confirmation_amount: 0,
      delivery_fee: 0,
      payment_method: '',
      lines: [{ product_id: '', quantity: 1 }],
    },
  })
  useEffect(() => {
    if (profile?.id && sellers.some((seller) => seller.id === profile.id)) setValue('seller_id', profile.id)
  }, [profile?.id, sellers, setValue])

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Live "à collecter par le livreur" = order total − confirmation deposit.
  const priceById = new Map(activeProducts.map((p) => [p.id, p.sale_price]))
  const watchedLines = useWatch({ control, name: 'lines' }) ?? []
  const watchedConfirmation = useWatch({ control, name: 'confirmation_amount' })
  const watchedDeliveryFee = useWatch({ control, name: 'delivery_fee' })
  const orderTotal = watchedLines.reduce(
    (sum, line) => sum + (priceById.get(line?.product_id ?? '') ?? 0) * (Number(line?.quantity) || 0),
    0
  )
  const confirmationAmount = Number(watchedConfirmation) || 0
  const deliveryFee = Number(watchedDeliveryFee) || 0
  const totalWithDelivery = orderTotal + deliveryFee
  const toCollect = Math.max(0, totalWithDelivery - confirmationAmount)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Informations client</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nom du client"
            error={errors.client_name?.message}
            {...register('client_name')}
          />
          <Input
            label="Téléphone (optionnel)"
            type="tel"
            {...register('client_phone')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Canal d'acquisition"
              options={channelOptions}
              error={errors.channel?.message}
              {...register('channel')}
            />
            <Input
              label="Date de commande"
              type="date"
              error={errors.order_date?.message}
              {...register('order_date')}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Vendeur" options={sellers.map(s => ({ value: s.id, label: s.full_name }))}
              placeholder="Sélectionner un vendeur" error={errors.seller_id?.message} {...register('seller_id')} />
            <Select label="Session live (optionnel)" options={lives.map(l => ({ value: l.id, label: `${l.name || 'Live'} · ${l.session_date}` }))}
              placeholder="Aucun live" error={errors.live_session_id?.message} {...register('live_session_id')} />
          </div>
          <Select
            label="Livreur assigné"
            options={drivers.filter((driver) => driver.is_active).map((driver) => ({ value: driver.id, label: driver.name }))}
            placeholder="Aucun livreur pour le moment"
            error={errors.delivery_driver_id?.message}
            {...register('delivery_driver_id')}
          />
          <Input
            label="Lieu de livraison (optionnel)"
            placeholder="Ex : Cocody, Angré 8e tranche"
            error={errors.delivery_location?.message}
            {...register('delivery_location')}
          />
          <Input label="Coût de livraison (FCFA)" type="number" min={0} placeholder="0"
            error={errors.delivery_fee?.message} {...register('delivery_fee')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Produits</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => append({ product_id: '', quantity: 1 })}
            >
              + Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {errors.lines?.root && (
            <p className="text-xs text-red-600">{errors.lines.root.message}</p>
          )}
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-end">
              <div className="flex-1">
                <Select
                  label={index === 0 ? 'Produit' : undefined}
                  options={productOptions}
                  placeholder="Sélectionner un produit"
                  error={(errors.lines?.[index] as { product_id?: { message?: string } })?.product_id?.message}
                  {...register(`lines.${index}.product_id`)}
                />
              </div>
              <div className="w-24">
                <Input
                  label={index === 0 ? 'Qté' : undefined}
                  type="number"
                  min={1}
                  error={(errors.lines?.[index] as { quantity?: { message?: string } })?.quantity?.message}
                  {...register(`lines.${index}.quantity`)}
                />
              </div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-red-500 mb-0.5"
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-semibold text-gray-900">Dépôt de réservation optionnel</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Laissez le montant à 0 et le moyen de paiement vide si le client n’a rien payé d’avance.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Montant du dépôt (FCFA)"
              type="number"
              min={0}
              placeholder="0"
              error={errors.confirmation_amount?.message}
              {...register('confirmation_amount')}
            />
            <Select
              label="Moyen de paiement du dépôt"
              options={paymentMethodOptions}
              placeholder="Aucun dépôt"
              error={errors.payment_method?.message}
              {...register('payment_method')}
            />
          </div>
          {isAdmin && orderTotal > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Coût du colis</span>
                <span>{formatCurrency(orderTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500 mt-1"><span>Livraison</span><span>+ {formatCurrency(deliveryFee)}</span></div>
              {confirmationAmount > 0 && (
                <div className="flex justify-between text-gray-500 mt-1">
                  <span>Dépôt payé</span>
                  <span>− {formatCurrency(confirmationAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 mt-2 pt-2 border-t border-gray-200">
                <span>À collecter · total {formatCurrency(totalWithDelivery)}</span>
                <span className="text-indigo-600">{formatCurrency(toCollect)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading} size="lg">
        {isLoading ? 'Enregistrement...' : 'Créer la commande'}
      </Button>
    </form>
  )
}
