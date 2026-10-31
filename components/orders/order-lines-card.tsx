import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency, resolveUnitCost } from "@/lib/utils";
import type { Order } from "@/types/order";
export function OrderLinesCard({
  lines,
  isAdmin,
}: {
  lines: NonNullable<Order["order_lines"]>;
  isAdmin: boolean;
}) {
  const rows = lines.map((line) => {
    const price = Number(
      line.pricing_type === "offer"
        ? (line.offer_price ?? 0)
        : (line.unit_price ?? 0),
    );
    const total = Number(
      line.line_total ?? (line.unit_price ?? 0) * line.quantity,
    );
    const cost = isAdmin
      ? resolveUnitCost(line.unit_cost ?? 0, line.product)
      : 0;
    const profit = isAdmin
      ? total - Number(line.total_cost ?? cost * line.quantity)
      : 0;
    return { line, price, total, cost, profit };
  });
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-gray-900">Produits commandés</h2>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">Aucun article renseigné.</p>
        ) : (
          <>
            <ul className="space-y-3 sm:hidden">
              {rows.map(({ line, price, total, cost, profit }) => (
                <li
                  key={line.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-gray-900">
                        {line.product?.name ?? "Produit"}
                      </p>
                      {line.variant_name && (
                        <p className="text-xs text-gray-500">
                          {line.variant_name}
                        </p>
                      )}
                      {line.pricing_type === "offer" && (
                        <p className="text-xs text-indigo-600">
                          {line.offer_name} · {line.offer_count} offre(s) ×{" "}
                          {line.units_per_offer}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">
                      ×{line.quantity}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">
                        {line.pricing_type === "offer"
                          ? "Prix / offre"
                          : "Prix unit."}
                      </dt>
                      <dd className="text-gray-700">{formatCurrency(price)}</dd>
                    </div>
                    {Number(line.discount_amount) > 0 && (
                      <>
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">Remise</dt>
                          <dd className="text-gray-700">
                            − {formatCurrency(line.discount_amount ?? 0)}
                          </dd>
                        </div>
                        {line.discount_reason && (
                          <div>
                            <dt className="text-xs text-gray-500">Motif</dt>
                            <dd className="break-words text-xs text-gray-600">
                              {line.discount_reason}
                            </dd>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between gap-2">
                      <dt className="font-medium text-gray-900">Total</dt>
                      <dd className="font-semibold text-gray-900">
                        {formatCurrency(total)}
                      </dd>
                    </div>
                    {isAdmin && (
                      <>
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">Coût unit.</dt>
                          <dd className="text-gray-500">
                            {formatCurrency(cost)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-gray-500">Bénéfice</dt>
                          <dd
                            className={
                              profit >= 0
                                ? "font-semibold text-green-600"
                                : "font-semibold text-red-600"
                            }
                          >
                            {formatCurrency(profit)}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Articles de la commande</caption>
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    {[
                      "Produit",
                      "Qté",
                      "Prix",
                      "Total",
                      ...(isAdmin ? ["Coût unit.", "Bénéfice"] : []),
                    ].map((label, i) => (
                      <th
                        key={label}
                        className={`pb-3 pr-4 font-medium text-gray-500 ${i > 0 ? "text-right" : ""}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(({ line, price, total, cost, profit }) => (
                    <tr key={line.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">
                          {line.product?.name ?? "Produit"}
                        </p>
                        {line.pricing_type === "offer" && (
                          <p className="text-xs text-indigo-600">
                            {line.offer_name} · {line.offer_count} offre(s) ×{" "}
                            {line.units_per_offer}
                          </p>
                        )}
                        {Number(line.discount_amount) > 0 && (
                          <p className="text-xs text-gray-500">
                            Remise : {formatCurrency(line.discount_amount ?? 0)}
                            {line.discount_reason
                              ? ` · ${line.discount_reason}`
                              : ""}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-600">
                        {line.quantity}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-600">
                        {formatCurrency(price)}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                        {formatCurrency(total)}
                      </td>
                      {isAdmin && (
                        <>
                          <td className="py-3 pr-4 text-right text-gray-500">
                            {formatCurrency(cost)}
                          </td>
                          <td
                            className={`py-3 text-right font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatCurrency(profit)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
