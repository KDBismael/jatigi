"use client";
import { DeliveryDayCard } from "./delivery-day-card";
import { DeliveryDayTotals } from "./delivery-day-totals";

import { useEffect, useId, useState } from "react";
import { Paywall } from "@/components/billing/billing-usage-banner";
import { useAuthStore } from "@/stores/auth-store";
import { deliveryBalanceCsv } from "@/lib/delivery-balance-export";
import { Button } from "@/components/ui/button";
import type {
  DeliveryDayReport,
} from "@/types/delivery-balance";

function day(offset = 0) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function DailyDeliveryBalance({
  onSettle,
  refreshKey = 0,
}: {
  onSettle?: (id: string) => void;
  refreshKey?: number;
}) {
  const canManageBilling = useAuthStore(
    (s) => s.organization?.owner_id === s.profile?.id,
  );
  const [date, setDate] = useState(() => day());
  const [result, setResult] = useState<{
    date: string;
    report?: DeliveryDayReport;
    error?: string;
    upgrade?: boolean;
  } | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const inputId = useId();
  const valid = validDate(date);
  const current = result?.date === date ? result : null;
  const report = current?.report;

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/delivery-balance?date=${date}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 402) {
          const data = await response.json();
          if (active) setResult({ date, error: data.error, upgrade: true });
          return;
        }
        if (!response.ok) throw new Error("Chargement impossible");
        const report: DeliveryDayReport = await response.json();
        if (report.date !== date) throw new Error("Date du bilan incorrecte");
        if (active) setResult({ date, report });
      } catch {
        if (active)
          setResult({
            date,
            error: "Impossible de charger le bilan. Réessayez.",
          });
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [date, valid, attempt, refreshKey]);

  function selectDate(value: string) {
    if (value === date) return;
    setResult(null);
    setExpanded([]);
    setDate(value);
  }
  const totals = report?.drivers.reduce(
    (total, driver) => ({
      delivered: total.delivered + driver.counts.delivered,
      in_progress: total.in_progress + driver.counts.in_progress,
      cancelled: total.cancelled + driver.counts.cancelled,
      postponed: total.postponed + driver.counts.postponed,
      expectedRemittance: total.expectedRemittance + driver.expectedRemittance,
    }),
    {
      delivered: 0,
      in_progress: 0,
      cancelled: 0,
      postponed: 0,
      expectedRemittance: 0,
    },
  );

  return (
    <section className="space-y-5" aria-label="Bilan quotidien des livraisons">
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bilan du jour</h2>
          <p className="mt-1 text-sm text-gray-500">
            Colis confiés aux livreurs à la date de tournée sélectionnée (heure
            d’Abidjan).
          </p>
        </div>
        <div className="grid grid-cols-2 @lg:grid-cols-[1fr_0.7fr_1.4fr] items-end gap-2">
          <Button
            variant={date === day() ? "primary" : "secondary"}
            onClick={() => selectDate(day())}
            aria-pressed={date === day()}
          >
            Aujourd’hui
          </Button>
          <Button
            variant={date === day(-1) ? "primary" : "secondary"}
            onClick={() => selectDate(day(-1))}
            aria-pressed={date === day(-1)}
          >
            Hier
          </Button>
          <label htmlFor={inputId} className="col-span-2 min-w-0 @lg:col-span-1">
            <span className="sr-only">Date de tournée</span>
            <input
              id={inputId}
              type="date"
              value={date}
              onChange={(event) => selectDate(event.target.value)}
              className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 text-base text-gray-700"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          À remettre attendu : produits livrés après remises et acomptes
          conservés par la boutique, hors frais de livraison. Les versements
          sont affichés à leur date de paiement, même pour une ancienne tournée.
          Le reste dû global est le solde actuel, toutes dates confondues.
        </p>
      </div>
      {!valid && (
        <p className="text-sm text-gray-600">Choisissez une date valide.</p>
      )}
      {valid && !current && (
        <p role="status" className="text-sm text-gray-500">
          Chargement du bilan…
        </p>
      )}
      {current?.upgrade && (
        <Paywall
          message={current.error ?? "Disponible avec Pro"}
          canManageBilling={canManageBilling}
        />
      )}
      {current?.error && !current.upgrade && (
        <div className="space-y-2">
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            {current.error}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setResult(null);
              setAttempt((value) => value + 1);
            }}
          >
            Réessayer
          </Button>
        </div>
      )}
      {report && (
        <>
          <Button
            variant="secondary"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([deliveryBalanceCsv(report)], {
                  type: "text/csv;charset=utf-8",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = `warko-bilan-livreurs-${report.date}.csv`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Exporter le bilan (Google Sheets)
          </Button>
          {report.undatedOrders > 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {report.undatedOrders} commandes sans date de tournée : ces
              anciennes affectations sont exclues du bilan. Renseignez la date
              dans le détail de chaque commande.
            </p>
          )}
          {totals && <DeliveryDayTotals totals={totals} />}
          {report.drivers.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Aucun colis confié aux livreurs pour cette date.
            </p>
          ) : (
            <div className="space-y-3">
              {report.drivers.map((driver, index) => (
                <DeliveryDayCard
                  key={driver.driverId}
                  driver={driver}
                  open={expanded.includes(driver.driverId)}
                  detailsId={`${inputId}-driver-${index}`}
                  onSettle={onSettle}
                  onToggle={() =>
                    setExpanded((previous) =>
                      previous.includes(driver.driverId)
                        ? previous.filter((id) => id !== driver.driverId)
                        : [...previous, driver.driverId],
                    )
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
