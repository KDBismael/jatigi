"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./order-status-badge";
import { CHANNEL_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Order } from "@/types/order";
export function OrderDetailHeader({
  order,
  onEdit,
}: {
  order: Order;
  onEdit?: () => void;
}) {
  return (
    <header className="space-y-3">
      <Link
        href="/orders"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-indigo-700 hover:underline"
      >
        <Icon name="chevron-left" className="h-4 w-4" />
        Commandes
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold text-gray-900">
            {order.client_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {CHANNEL_LABELS[order.channel]} · {formatDate(order.order_date)}
          </p>
          {order.client_phone && (
            <a
              href={`tel:${order.client_phone.replace(/[^+\d]/g, "")}`}
              className="inline-flex min-h-11 items-center text-sm text-indigo-700"
            >
              {order.client_phone}
            </a>
          )}
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/orders/${order.id}/print`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Imprimer
        </Link>
        {onEdit && (
          <Button type="button" variant="secondary" onClick={onEdit}>
            Modifier
          </Button>
        )}
      </div>
    </header>
  );
}
