"use client";
import { useId, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
export function SettlementForm({
  driverName,
  maxAmount,
  date,
  amount,
  busy,
  onDateChange,
  onAmountChange,
  onSubmit,
  onCancel,
}: {
  driverName: string;
  maxAmount: number;
  date: string;
  amount: string;
  busy: boolean;
  onDateChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const id = useId(),
    [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader>
        <h2 className="break-words font-semibold text-gray-900">
          Reversement de {driverName}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Solde global actuel : {formatCurrency(maxAmount)}. Ce montant peut
          inclure plusieurs tournées.
        </p>
      </CardHeader>
      <CardContent>
        <form
          aria-label={`Reversement de ${driverName}`}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            const value = Number(amount);
            if (!Number.isFinite(value) || value <= 0 || value > maxAmount) {
              setError(
                "Saisissez un montant positif inférieur ou égal au solde global actuel.",
              );
              return;
            }
            if (
              !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
              Number.isNaN(Date.parse(date)) ||
              new Date(date).toISOString().slice(0, 10) !== date
            ) {
              setError("Saisissez une date de reversement valide.");
              return;
            }
            setError(null);
            onSubmit();
          }}
        >
          <Input
            id={`${id}-amount`}
            label="Montant reversé (FCFA)"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            max={maxAmount}
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            required
            disabled={busy}
            className="min-h-11"
          />
          <Input
            id={`${id}-date`}
            label="Date du reversement"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            required
            disabled={busy}
            className="min-h-11"
          />
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer le reversement"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onCancel}
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
