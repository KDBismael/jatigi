"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type {
  DeliveryDayDriver,
  DeliveryDayStatus,
} from "@/types/delivery-balance";
export const DELIVERY_DAY_STATUSES = [
  { key: "delivered", label: "Livrés" },
  { key: "in_progress", label: "En cours" },
  { key: "cancelled", label: "Annulés" },
  { key: "postponed", label: "Reportés" },
] as const;
const STATUS_LABEL: Record<DeliveryDayStatus, string> = {
  delivered: "Livré",
  in_progress: "En cours",
  cancelled: "Annulé",
  postponed: "Reporté",
};
export function DeliveryDayCard({
  driver,
  open,
  detailsId,
  onToggle,
  onSettle,
}: {
  driver: DeliveryDayDriver;
  open: boolean;
  detailsId: string;
  onToggle: () => void;
  onSettle?: (id: string) => void;
}) {
  const initials = driver.driverName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        data-testid="delivery-driver-toggle"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      >
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700"
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold text-gray-900">
            {driver.driverName}
          </span>
          <span className="block text-xs text-gray-500">
            {driver.counts.delivered} livrés · {driver.counts.in_progress} en
            cours{!driver.isActive ? " · Archivé" : ""}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-bold text-indigo-700">
            {driver.globalAmountDue == null
              ? "Non documenté"
              : formatCurrency(driver.globalAmountDue)}
          </span>
          <span className="block text-[11px] text-gray-500">
            Reste dû global actuel
          </span>
        </span>
        <Icon
          name="chevron-down"
          className={`h-4 w-4 text-gray-500 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      <dl className="grid grid-cols-2 gap-3 border-t border-gray-100 px-4 py-3 text-xs @2xl:grid-cols-4">
        {[
          { label: "Encaissé sur la tournée", value: driver.amountCollected },
          { label: "Frais retenus", value: driver.deliveryFees },
          { label: "Reversé à cette date", value: driver.remittedOnDate ?? 0 },
          { label: "À remettre attendu", value: driver.expectedRemittance },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="mt-1 font-semibold break-words [overflow-wrap:anywhere] text-gray-900">
              {value == null ? "Non documenté" : formatCurrency(value)}
            </dd>
          </div>
        ))}
      </dl>
      <dl className="grid grid-cols-4 gap-2 border-t border-gray-100 px-4 py-3 text-center">
        {DELIVERY_DAY_STATUSES.map(({ key, label }) => (
          <div key={key}>
            <dt className="text-[11px] text-gray-500">{label}</dt>
            <dd className="font-semibold text-gray-900">
              {driver.counts[key]}
            </dd>
          </div>
        ))}
      </dl>
      {open && (
        <div id={detailsId} className="border-t border-gray-100 bg-gray-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Commandes de la tournée
          </h3>
          <ul className="space-y-2">
            {driver.orders.map((order) => (
              <li
                key={order.assignmentId}
                className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/orders/${order.orderId}`}
                    className="inline-flex min-h-11 items-center break-words font-semibold text-indigo-700 hover:underline"
                  >
                    {order.clientName}
                  </Link>
                  <span className="shrink-0 text-xs text-gray-600">
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
                <p className="break-words text-gray-600">{order.products}</p>
                <p className="text-xs text-gray-500">
                  {order.clientPhone || "Téléphone non renseigné"}
                </p>
                <p className="mt-2 font-medium text-gray-900">
                  {order.status === "delivered" || order.status === "cancelled"
                    ? "À remettre"
                    : "À remettre si livré"}{" "}
                  :{" "}
                  {formatCurrency(
                    order.status === "cancelled" ? 0 : order.remittableAmount,
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {onSettle && Number(driver.globalAmountDue) > 0 && (
        <div className="border-t border-gray-100 p-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full whitespace-normal"
            aria-label={`Enregistrer un reversement pour ${driver.driverName}`}
            onClick={() => onSettle(driver.driverId)}
          >
            Enregistrer un reversement
          </Button>
        </div>
      )}
    </article>
  );
}
