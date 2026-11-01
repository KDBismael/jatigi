"use client";
import { Icon } from "@/components/ui/icon";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DiscountEditor } from "@/components/orders/discount-editor";
import { OrderLinesCard } from "@/components/orders/order-lines-card";
import { OrderDetailHeader } from "@/components/orders/order-detail-header";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { OrderDeliveryCard } from "@/components/orders/order-delivery-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, resolveUnitCost } from "@/lib/utils";
import { orderAmounts, orderRemittableAmount } from "@/lib/order-amounts";
import { canManageDeliveries } from "@/lib/delivery-access";
import { managerStatusOptions } from "@/lib/order-access";
import {
  CHANNELS,
  CHANNEL_LABELS,
  STATUSES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type OrderStatus,
} from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import type { Order } from "@/types/order";
import { useDeliveryDrivers } from "@/hooks/use-delivery-drivers";
import { useOrderOptions } from "@/hooks/use-order-options";

const channelOptions = CHANNELS.map((c) => ({
  value: c,
  label: CHANNEL_LABELS[c],
}));
const paymentMethodOptions = PAYMENT_METHODS.map((m) => ({
  value: m,
  label: PAYMENT_METHOD_LABELS[m],
}));

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isManager = useAuthStore((s) => s.profile?.role === "manager");
  
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const canSettle = canManageDeliveries(useAuthStore((s) => s.profile?.role));
  const { drivers } = useDeliveryDrivers();
  const { sellers, lives } = useOrderOptions();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editChannel, setEditChannel] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDriverId, setEditDriverId] = useState("");
  const [editDeliveryDate, setEditDeliveryDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDeliveryFee, setEditDeliveryFee] = useState("");
  const [editSellerId, setEditSellerId] = useState("");
  const [editLiveId, setEditLiveId] = useState("");
  const [editConfirmationAmount, setEditConfirmationAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      if (!active) return;
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/orders/${id}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Impossible de charger la commande.",
          );
        if (active) setOrder(data);
      } catch (error) {
        if (active) {
          setOrder(null);
          setLoadError(
            error instanceof Error
              ? error.message
              : "Connexion impossible. Réessayez.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void Promise.resolve().then(load);
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const deliveryDateRef = useRef<HTMLInputElement>(null);
  const [focusDeliveryDate, setFocusDeliveryDate] = useState(false);
  useEffect(() => {
    if (isEditing && focusDeliveryDate) deliveryDateRef.current?.focus();
  }, [isEditing, focusDeliveryDate]);

  function startEdit(focusDate = false) {
    setFocusDeliveryDate(focusDate);
    if (!order) return;
    setEditName(order.client_name);
    setEditPhone(order.client_phone ?? "");
    setEditChannel(order.channel);
    setEditDate(order.order_date);
    setEditDriverId(order.delivery_driver_id ?? "");
    setEditDeliveryDate(order.delivery_date ?? "");
    setEditLocation(order.delivery_location ?? "");
    setEditDeliveryFee(String(order.delivery_fee ?? 0));
    setEditSellerId(order.seller_id ?? "");
    setEditLiveId(order.live_session_id ?? "");
    setEditConfirmationAmount(
      order.confirmation_amount ? String(order.confirmation_amount) : "",
    );
    setEditPaymentMethod(order.payment_method ?? "");
    setSaveError(null);
    setIsEditing(true);
  }

  async function saveEdit() {
    setSaveError(null);
    if (editDriverId && !editDeliveryDate) {
      setSaveError("Renseignez la date de tournée du colis confié au livreur.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: editName,
          client_phone: editPhone || null,
          channel: editChannel,
          order_date: editDate,
          delivery_driver_id: editDriverId || null,
          delivery_date: editDriverId ? editDeliveryDate : null,
          delivery_location: editLocation || null,
          delivery_fee: Number(editDeliveryFee) || 0,
          ...(isAdmin
            ? { seller_id: editSellerId, live_session_id: editLiveId || null }
            : {}),
          confirmation_amount: Number(editConfirmationAmount) || 0,
          payment_method: editPaymentMethod || "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(
          typeof err.error === "string"
            ? err.error
            : "Vérifiez les informations et la date de tournée.",
        );
        return;
      }
      const updated = await res.json();
      setOrder(updated);
      setIsEditing(false);
    } catch {
      setSaveError("Connexion impossible. Réessayez.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
      } else {
        const data = await res.json();
        setStatusError(
          typeof data.error === "string"
            ? data.error
            : "Impossible de modifier le statut.",
        );
      }
    } catch {
      setStatusError("Connexion impossible. Réessayez.");
    } finally {
      setUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16 text-gray-500">
        {loadError ? (
          <p role="alert">{loadError}</p>
        ) : (
          <p>Commande introuvable.</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mt-4 block mx-auto"
        >
          <Icon name="chevron-left" className="inline-block h-4 w-4" /> Retour
        </Button>
      </div>
    );
  }

  const lines = order.order_lines ?? [];
  const totalRevenue = lines.reduce(
    (s, l) => s + Number(l.line_total ?? (l.unit_price ?? 0) * l.quantity),
    0,
  );
  const totalCost = lines.reduce(
    (s, l) =>
      s +
      Number(
        l.total_cost ??
          resolveUnitCost(l.unit_cost ?? 0, l.product) * l.quantity,
      ),
    0,
  );
  const totalProfit = totalRevenue - totalCost;
  const amounts = orderAmounts(
    lines,
    order.delivery_fee ?? 0,
    order.confirmation_amount ?? 0,
  );
  const toReverse = orderRemittableAmount(
    lines,
    order.confirmation_amount ?? 0,
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <OrderDetailHeader
        order={order}
        onEdit={!isEditing && !isManager ? () => startEdit() : undefined}
      />
      <OrderStatusActions
        status={order.status}
        statuses={isManager ? managerStatusOptions(order.status) : STATUSES}
        busy={updating}
        onChange={handleStatusChange}
        error={statusError}
        canEdit={!isManager}
      />

      {/* Inline edit form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">
              Modifier la commande
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nom du client"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <Input
                label="Téléphone (optionnel)"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <Select
              id="edit-order-driver"
              label="Livreur assigné"
              disabled={Boolean(
                order.status === "delivered" ||
                  order.status === "cancelled" ||
                  order.discounts_locked_at,
              )}
              options={drivers
                .filter(
                  (driver) =>
                    driver.is_active || driver.id === order.delivery_driver_id,
                )
                .map((driver) => ({
                  value: driver.id,
                  label: `${driver.name}${driver.is_active ? "" : " (archivé)"}`,
                }))}
              placeholder="Aucun livreur"
              value={editDriverId}
              onChange={(event) => {
                setEditDriverId(event.target.value);
                if (event.target.value !== order.delivery_driver_id)
                  setEditDeliveryDate(new Date().toISOString().slice(0, 10));
              }}
            />
            {editDriverId && (
              <div>
                <Input
                  ref={deliveryDateRef}
                  id="edit-order-delivery-date"
                  label="Date de tournée"
                  type="date"
                  required
                  value={editDeliveryDate}
                  disabled={Boolean(
                    order.delivery_date &&
                      (order.status === "delivered" ||
                        order.status === "cancelled" ||
                        order.discounts_locked_at),
                  )}
                  onChange={(event) => setEditDeliveryDate(event.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Jour où le colis est confié au livreur. Pour reprendre un
                  colis reporté, choisissez sa nouvelle journée de tournée.
                </p>
              </div>
            )}
            {isAdmin && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Vendeur"
                  options={sellers.map((s) => ({
                    value: s.id,
                    label: s.full_name,
                  }))}
                  value={editSellerId}
                  onChange={(e) => setEditSellerId(e.target.value)}
                />
                <Select
                  label="Session live"
                  options={lives.map((l) => ({
                    value: l.id,
                    label: `${l.name || "Live"} · ${l.session_date}`,
                  }))}
                  placeholder="Aucun live"
                  value={editLiveId}
                  onChange={(e) => setEditLiveId(e.target.value)}
                />
              </div>
            )}
            <Input
              label="Lieu de livraison (optionnel)"
              placeholder="Ex : Cocody, Angré 8e tranche"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
            />
            <Input
              label="Coût de livraison (FCFA)"
              type="number"
              min={0}
              value={editDeliveryFee}
              onChange={(e) => setEditDeliveryFee(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Canal"
                options={channelOptions}
                value={editChannel}
                onChange={(e) => setEditChannel(e.target.value)}
              />
              <Input
                label="Date de commande"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Montant du dépôt (FCFA)"
                type="number"
                min={0}
                placeholder="0"
                value={editConfirmationAmount}
                onChange={(e) => setEditConfirmationAmount(e.target.value)}
              />
              <Select
                label="Moyen de paiement du dépôt"
                options={paymentMethodOptions}
                placeholder="Aucun dépôt"
                value={editPaymentMethod}
                onChange={(e) => setEditPaymentMethod(e.target.value)}
              />
            </div>
            {saveError && (
              <p role="alert" className="text-sm text-red-600">
                {saveError}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={isSaving}>
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <OrderDeliveryCard
        order={order}
        canSettle={canSettle}
        toReverse={toReverse}
        onFillDate={
          !isManager && !isEditing ? () => startEdit(true) : undefined
        }
      />

      {/* Deposit (read-only) */}
      {order.confirmation_amount > 0 && !isEditing && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">
              Dépôt de réservation
            </h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Dépôt payé par le client</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(order.confirmation_amount)}
              </span>
            </div>
            {order.payment_method && (
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">Moyen de paiement</span>
                <span className="font-medium text-gray-700">
                  {PAYMENT_METHOD_LABELS[order.payment_method]}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isManager && <DiscountEditor order={order} onSaved={setOrder} />}

      <OrderLinesCard lines={lines} isAdmin={isAdmin} />

      {/* Financial summary — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 font-medium">
                Total avec livraison
              </p>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {formatCurrency(amounts.totalAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Colis {formatCurrency(totalRevenue)} + livraison{" "}
                {formatCurrency(amounts.deliveryFee)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 font-medium">Coût total</p>
              <p className="text-xl font-bold text-gray-700 mt-1">
                {formatCurrency(totalCost)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 font-medium">Bénéfice net</p>
              <p
                className={`text-xl font-bold mt-1 ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(totalProfit)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Client info */}
      {(order.client_phone || order.delivery_location) && !isEditing && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">
              Contact &amp; livraison
            </h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.client_phone && (
              <p className="text-sm text-gray-700">{order.client_phone}</p>
            )}
            {order.delivery_location && (
              <div>
                <p className="text-xs text-gray-500">Lieu de livraison</p>
                <p className="text-sm text-gray-700">
                  {order.delivery_location}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
