"use client";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@/types/order";
export function OrderDeliveryCard({
  order,
  canSettle,
  toReverse,
  onFillDate,
}: {
  order: Order;
  canSettle: boolean;
  toReverse: number;
  onFillDate?: () => void;
}) {
  const driver = order.delivery_driver;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-gray-900">Livraison</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {driver ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words font-semibold text-gray-900">
                {driver.name}
              </p>
              {driver.phone && (
                <p className="text-sm text-gray-500">{driver.phone}</p>
              )}
            </div>
            {driver.phone && (
              <a
                className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                aria-label={`Appeler ${driver.name}`}
                href={`tel:${driver.phone.replace(/[^+\d]/g, "")}`}
              >
                Appeler
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun livreur assigné.</p>
        )}
        {order.delivery_driver_id &&
          (order.delivery_date ? (
            <p className="text-sm text-gray-600">
              Date de tournée : {formatDate(order.delivery_date)}
            </p>
          ) : (
            <div
              role="note"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
            >
              <p className="text-sm text-amber-900">
                <strong>Date de tournée non renseignée.</strong>
                <br />
                Nécessaire pour le bilan quotidien.
              </p>
              {onFillDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-amber-900"
                  onClick={onFillDate}
                >
                  Renseigner
                </Button>
              )}
            </div>
          ))}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            {
              label: "Lieu",
              value: order.delivery_location || "Non renseigné",
            },
            {
              label: "Frais de livraison",
              value: formatCurrency(order.delivery_fee ?? 0),
            },
            {
              label: "Vendeur",
              value: order.seller?.full_name ?? "Non renseigné",
            },
            {
              label: "Session live",
              value:
                order.live_session?.name ??
                (order.live_session ? "Live" : "Aucune"),
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="mt-1 break-words font-medium text-gray-900">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {canSettle && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50 p-3 text-sm">
            <span className="text-gray-600">
              À reverser par le livreur
              <br />
              <span className="text-xs">hors frais de livraison</span>
            </span>
            <strong className="text-base text-indigo-700">
              {formatCurrency(toReverse)}
            </strong>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
