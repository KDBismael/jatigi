'use client'

import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { orderSchema, type OrderInput } from '@/lib/schemas/order.schema'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CHANNELS, CHANNEL_LABELS } from '@/lib/constants'
import type { Product } from '@/types/product'
import type { DeliveryDriverSummary } from '@/types/delivery-driver'

interface OrderFormProps {
  onSubmit: (data: OrderInput) => Promise<void>
  products: Product[]
  drivers: DeliveryDriverSummary[]
  isLoading?: boolean
}

const channelOptions = CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))

export function OrderForm({ onSubmit, products, drivers, isLoading }: OrderFormProps) {
  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (stock: ${p.stock_quantity})`,
  }))

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema) as unknown as Resolver<OrderInput>,
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      lines: [{ product_id: '', quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

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
          <Select
            label="Livreur assigné"
            options={drivers.filter((driver) => driver.is_active).map((driver) => ({ value: driver.id, label: driver.name }))}
            placeholder="Aucun livreur pour le moment"
            error={errors.delivery_driver_id?.message}
            {...register('delivery_driver_id')}
          />
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

      <Button type="submit" disabled={isLoading} size="lg">
        {isLoading ? 'Enregistrement...' : 'Créer la commande'}
      </Button>
    </form>
  )
}
