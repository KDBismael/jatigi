"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { STATUS_LABELS, type OrderStatus } from "@/lib/constants";
const PRIMARY = ["delivered", "postponed", "cancelled", "returned"] as const;
const COLORS: Record<(typeof PRIMARY)[number], string> = {
  delivered: "border-green-700 bg-green-700 text-white hover:bg-green-800",
  postponed:
    "border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100",
  cancelled: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
  returned: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
};
export function OrderStatusActions({
  status,
  statuses,
  busy,
  onChange,
  error,
  canEdit = true,
}: {
  status: OrderStatus;
  statuses: readonly OrderStatus[];
  busy: boolean;
  onChange: (status: OrderStatus) => void;
  error?: string | null;
  canEdit?: boolean;
}) {
  const other = statuses.filter(
    (s) => !(PRIMARY as readonly string[]).includes(s),
  );
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-gray-900">Mettre à jour le statut</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div
          role="group"
          aria-label="Actions principales"
          className="grid grid-cols-2 gap-2"
        >
          {PRIMARY.filter((s) => statuses.includes(s)).map((s) => (
            <Button
              key={s}
              type="button"
              variant="secondary"
              className={COLORS[s]}
              disabled={busy || status === s}
              aria-pressed={status === s}
              onClick={() => onChange(s)}
            >
              {STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
        {other.length > 0 && (
          <Select
            label="Autre statut"
            aria-label="Autre statut"
            className="min-h-11"
            placeholder="Choisir une autre transition"
            value={other.includes(status) ? status : ""}
            disabled={busy}
            options={other.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            onChange={(event) => {
              const value = event.target.value as OrderStatus;
              if (statuses.includes(value) && value !== status) onChange(value);
            }}
          />
        )}
        {status === "postponed" && (
          <p className="text-sm text-orange-800">
            {canEdit
              ? "Colis reporté : utilisez « Modifier » pour choisir la nouvelle date de tournée. Le bilan de la journée précédente sera conservé."
              : "Colis reporté : un administrateur ou un employé peut renseigner la prochaine date de tournée."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
