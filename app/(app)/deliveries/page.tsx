"use client";

import { deliveryDriverSchema } from "@/lib/schemas/delivery-driver.schema";
import { FormEvent, useState } from "react";
import { useDeliveryDrivers } from "@/hooks/use-delivery-drivers";
import { useRole } from "@/hooks/use-role";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SettlementForm } from "@/components/deliveries/settlement-form";
import { SettlementHistory } from "@/components/deliveries/settlement-history";
import { DailyDeliveryBalance } from "@/components/deliveries/daily-delivery-balance";
import { ParcelExport } from "@/components/orders/parcel-export";
import { formatCurrency } from "@/lib/utils";

export default function DeliveriesPage() {
  const { drivers, isLoading, error, create, settle, setActive } =
    useDeliveryDrivers();
  const { isAdmin, canManageDeliveries } = useRole();
  const canSettle = isAdmin || canManageDeliveries;
  const { summary } = useSubscription();
  const [selectedTab, setTab] = useState<"daily" | "global" | null>(null);
  const tab = selectedTab ?? (summary && summary.plan !== "discovery" ? "daily" : "global");
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settlementDate, setSettlementDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const parsed = deliveryDriverSchema.safeParse({ name, phone });
    if (!parsed.success) {
      const phoneIssue = parsed.error.issues.find(issue => issue.path[0] === "phone");
      setPhoneError(phoneIssue?.message ?? "");
      if (!phoneIssue) setFormError(parsed.error.issues[0].message);
      return;
    }
    setPhoneError("");
    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);
    try {
      await create(parsed.data);
      setName("");
      setPhone("");
      setShowDriverForm(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSettlement(driverId: string) {
    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);
    try {
      const amount = Number(settlementAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Saisissez un montant de versement valide.");
      }
      const driver = drivers.find((item) => item.id === driverId);
      if (!driver || amount > driver.amount_due)
        throw new Error(
          "Le montant dépasse le solde global actuel du livreur. Actualisez le bilan.",
        );
      await settle(driverId, {
        amount,
        settled_at: settlementDate,
        note: "",
      });
      setHistoryRefresh((x) => x + 1);
      setSettlementAmount("");
      setSettlingId(null);
      setSuccessMessage(`Versement de ${formatCurrency(amount)} enregistré.`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActive(driverId: string, isActive: boolean) {
    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);
    try {
      await setActive(driverId, isActive);
      setSuccessMessage(
        isActive
          ? "Livreur restauré."
          : "Livreur archivé. Son historique et ses soldes sont conservés.",
      );
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Modification impossible",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openSettlement(driverId: string) {
    setFormError(null);
    setSuccessMessage(null);
    if (
      !drivers.some((driver) => driver.id === driverId && driver.amount_due > 0)
    ) {
      setFormError(
        "Le solde global actuel ne permet pas de reversement. Actualisez le suivi.",
      );
      return;
    }
    setSettlementAmount("");
    setSettlingId(driverId);
  }
  const settlingDriver = drivers.find((driver) => driver.id === settlingId);
  const visibleDrivers = drivers.filter((driver) =>
    showArchived ? !driver.is_active : driver.is_active,
  );
  function archiveAction(driver: { id: string; is_active: boolean }) {
    return (
      isAdmin && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={submitting}
          onClick={() => handleActive(driver.id, !driver.is_active)}
        >
          {driver.is_active ? "Archiver" : "Restaurer"}
        </Button>
      )
    );
  }

  const totals = drivers.reduce(
    (sum, driver) => ({
      active: sum.active + driver.packages_in_progress,
      delivered: sum.delivered + driver.packages_delivered,
      due: sum.due + driver.amount_due,
    }),
    { active: 0, delivered: 0, due: 0 },
  );

  if (!canSettle)
    return (
      <p className="text-sm text-gray-500">
        Accès réservé aux responsables livraisons.
      </p>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Livraisons</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivez les colis et les reversements de chaque livreur.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setTab("global");
              setShowDriverForm((visible) => !visible);
            }}
          >
            + Ajouter un livreur
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Vue des livraisons">
        <Button
          variant={tab === "daily" ? "primary" : "secondary"}
          onClick={() => setTab("daily")}
        >
          Bilan du jour
        </Button>
        <Button
          variant={tab === "global" ? "primary" : "secondary"}
          onClick={() => setTab("global")}
        >
          Suivi global et versements
        </Button>
      </div>
      {/* An open settlement form shows its own refusal next to the amount. */}
      {(error || (formError && !(canSettle && settlingDriver))) && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {(canSettle && settlingDriver ? null : formError) ?? error}
        </p>
      )}
      {successMessage && (
        <p
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          {successMessage}
        </p>
      )}
      {canSettle && settlingDriver && (
        <SettlementForm
          driverName={settlingDriver.name}
          maxAmount={settlingDriver.amount_due}
          date={settlementDate}
          amount={settlementAmount}
          busy={submitting}
          onDateChange={setSettlementDate}
          onAmountChange={setSettlementAmount}
          onSubmit={() => handleSettlement(settlingDriver.id)}
          onCancel={() => {
            setSettlingId(null);
            setFormError(null);
          }}
          serverError={formError}
        />
      )}
      {tab === "daily" && (
        <DailyDeliveryBalance
          onSettle={openSettlement}
          refreshKey={historyRefresh}
        />
      )}
      {tab === "global" && (
        <>
          {isAdmin && <ParcelExport />}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500">Colis en circulation</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {totals.active}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500">Colis livrés</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {totals.delivered}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500">Total à reverser</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {formatCurrency(totals.due)}
                </p>
              </CardContent>
            </Card>
          </div>

          {showDriverForm && isAdmin && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-900">Nouveau livreur</h2>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleCreate}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
                >
                  <Input
                    label="Nom"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                  <Input
                    label="Téléphone"
                    type="tel"
                    value={phone}
                    error={phoneError}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setPhoneError("");
                    }}
                  />
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Ajout..." : "Ajouter"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900">
                Situation par livreur
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Les totaux incluent les livreurs archivés. Archiver conserve les
                colis, les versements et le solde dû.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant={showArchived ? "secondary" : "primary"}
                  onClick={() => setShowArchived(false)}
                >
                  Actifs ({drivers.filter((driver) => driver.is_active).length})
                </Button>
                <Button
                  size="sm"
                  variant={showArchived ? "primary" : "secondary"}
                  onClick={() => setShowArchived(true)}
                >
                  Archivés (
                  {drivers.filter((driver) => !driver.is_active).length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <Skeleton key={item} className="h-14 w-full" />
                  ))}
                </div>
              ) : visibleDrivers.length === 0 ? (
                <p className="text-center text-gray-500 py-10">
                  {showArchived
                    ? "Aucun livreur archivé."
                    : "Aucun livreur actif. Ajoutez un livreur pour commencer."}
                </p>
              ) : (
                <>
                  {/* Mobile: card per driver */}
                  <ul className="space-y-4 sm:hidden">
                    {visibleDrivers.map((driver) => (
                      <li
                        key={driver.id}
                        className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                      >
                        {/* Driver identity */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {driver.name}
                            </p>
                            {driver.phone && (
                              <p className="text-xs text-gray-400">
                                {driver.phone}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200">
                            {driver.success_rate}% réussite
                          </span>
                        </div>

                        {archiveAction(driver)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryId(driver.id)}
                        >
                          Historique des reversements
                        </Button>

                        {/* Package stats */}
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-white py-2 border border-gray-100">
                            <p className="text-lg font-bold text-orange-600 leading-none">
                              {driver.packages_in_progress}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              En cours
                            </p>
                          </div>
                          <div className="rounded-lg bg-white py-2 border border-gray-100">
                            <p className="text-lg font-bold text-green-600 leading-none">
                              {driver.packages_delivered}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Livrés
                            </p>
                          </div>
                          <div className="rounded-lg bg-white py-2 border border-gray-100">
                            <p className="text-lg font-bold text-gray-500 leading-none">
                              {driver.packages_cancelled}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Annulés
                            </p>
                          </div>
                        </div>

                        {/* Money breakdown */}
                        <dl className="mt-3 space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Encaissé</dt>
                            <dd className="text-gray-700 font-medium">
                              {formatCurrency(driver.amount_collected)}
                            </dd>
                          </div>
                          {driver.amount_delivery_fees > 0 && (
                            <div className="flex justify-between">
                              <dt className="text-gray-500">
                                Frais de livraison (livreur)
                              </dt>
                              <dd className="text-gray-700 font-medium">
                                − {formatCurrency(driver.amount_delivery_fees)}
                              </dd>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Déjà reversé</dt>
                            <dd className="text-gray-700 font-medium">
                              {formatCurrency(driver.amount_remitted)}
                            </dd>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 pt-1.5">
                            <dt className="text-gray-900 font-medium">
                              À reverser
                            </dt>
                            <dd className="text-indigo-700 font-bold">
                              {formatCurrency(driver.amount_due)}
                            </dd>
                          </div>
                        </dl>

                        {canSettle && driver.amount_due > 0 && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="mt-3 w-full"
                            onClick={() => openSettlement(driver.id)}
                          >
                            Enregistrer un versement
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Desktop: table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          <th className="pb-3 pr-4 font-medium text-gray-600">
                            Livreur
                          </th>
                          <th className="pb-3 pr-4 font-medium text-gray-600">
                            En cours
                          </th>
                          <th className="pb-3 pr-4 font-medium text-gray-600">
                            Livrés
                          </th>
                          <th className="pb-3 pr-4 font-medium text-gray-600">
                            Annulés
                          </th>
                          <th className="pb-3 pr-4 font-medium text-gray-600">
                            Réussite
                          </th>
                          <th className="pb-3 pr-4 font-medium text-gray-600">
                            Encaissé
                          </th>
                          <th className="pb-3 pr-4 font-medium text-gray-600">
                            Déjà reversé
                          </th>
                          <th className="pb-3 font-medium text-gray-600">
                            À reverser
                          </th>
                          {isAdmin && (
                            <th className="pb-3 font-medium text-gray-600">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {visibleDrivers.map((driver) => (
                          <tr key={driver.id}>
                            <td className="py-4 pr-4">
                              <p className="font-medium text-gray-900">
                                {driver.name}
                              </p>
                              {driver.phone && (
                                <p className="text-xs text-gray-400">
                                  {driver.phone}
                                </p>
                              )}
                            </td>
                            <td className="py-4 pr-4 text-orange-600 font-medium">
                              {driver.packages_in_progress}
                            </td>
                            <td className="py-4 pr-4 text-green-600 font-medium">
                              {driver.packages_delivered}
                            </td>
                            <td className="py-4 pr-4 text-gray-500">
                              {driver.packages_cancelled}
                            </td>
                            <td className="py-4 pr-4 text-gray-700">
                              {driver.success_rate}%
                            </td>
                            <td className="py-4 pr-4 text-gray-700">
                              {formatCurrency(driver.amount_collected)}
                              {driver.amount_delivery_fees > 0 && (
                                <p className="text-xs text-gray-500">
                                  dont livraison (livreur){" "}
                                  {formatCurrency(driver.amount_delivery_fees)}
                                </p>
                              )}
                            </td>
                            <td className="py-4 pr-4 text-gray-700">
                              {formatCurrency(driver.amount_remitted)}
                            </td>
                            <td className="py-4">
                              <p className="font-semibold text-indigo-700">
                                {formatCurrency(driver.amount_due)}
                              </p>
                              {canSettle && driver.amount_due > 0 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openSettlement(driver.id)}
                                >
                                  Enregistrer un versement
                                </Button>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="py-4">
                                {archiveAction(driver)}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setHistoryId(driver.id)}
                                >
                                  Historique des reversements
                                </Button>
                              </td>
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
          {historyId && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">
                  {drivers.find((d) => d.id === historyId)?.name}
                </h2>
              </CardHeader>
              <CardContent>
                <SettlementHistory
                  driverId={historyId}
                  refresh={historyRefresh}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
