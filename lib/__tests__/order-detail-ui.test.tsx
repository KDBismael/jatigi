// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { OrderDetailHeader } from "@/components/orders/order-detail-header";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { OrderDeliveryCard } from "@/components/orders/order-delivery-card";
import { DELIVERY_STATUSES } from "@/lib/order-access";
import { STATUSES } from "@/lib/constants";
import type { Order } from "@/types/order";
afterEach(cleanup);
const order = {
  id: "o",
  client_name: "Awa au nom particulièrement long",
  status: "in_progress",
  channel: "whatsapp",
  order_date: "2026-10-30",
  delivery_driver_id: "d",
  delivery_driver: { name: "Koffi", phone: "0700000000" },
  delivery_date: null,
  delivery_fee: 1500,
  seller: null,
  live_session: null,
} as unknown as Order;
it("separates readable header actions and keeps print accessible without editing rights", () => {
  render(<OrderDetailHeader order={order} />);
  expect(
    screen.getByRole("link", { name: "Commandes" }).getAttribute("href"),
  ).toBe("/orders");
  expect(
    screen.getByRole("link", { name: "Imprimer" }).getAttribute("href"),
  ).toBe("/orders/o/print");
  expect(screen.queryByRole("button", { name: "Modifier" })).toBeNull();
  expect(document.querySelector("a button")).toBeNull();
});
it("keeps four primary actions plus other allowed transitions", () => {
  const change = vi.fn();
  const { rerender } = render(
    <OrderStatusActions
      status="in_progress"
      statuses={STATUSES}
      busy={false}
      onChange={change}
    />,
  );
  const group = screen.getByRole("group", { name: "Actions principales" });
  expect(within(group).getAllByRole("button")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Livrée" }));
  expect(change).toHaveBeenCalledWith("delivered");
  fireEvent.change(screen.getByLabelText("Autre statut"), {
    target: { value: "confirmed" },
  });
  expect(change).toHaveBeenCalledWith("confirmed");
  rerender(
    <OrderStatusActions
      status="in_progress"
      statuses={DELIVERY_STATUSES}
      busy={false}
      onChange={change}
    />,
  );
  expect(screen.queryByRole("option", { name: "Reçue" })).toBeNull();
  expect(screen.queryByRole("option", { name: "Confirmée" })).toBeNull();
});
it("shows a callable phone and actionable missing date only when permitted", () => {
  const fill = vi.fn();
  const { rerender } = render(
    <OrderDeliveryCard
      order={order}
      canSettle
      toReverse={25000}
      onFillDate={fill}
    />,
  );
  expect(
    screen.getByRole("link", { name: "Appeler Koffi" }).getAttribute("href"),
  ).toBe("tel:0700000000");
  fireEvent.click(screen.getByRole("button", { name: "Renseigner" }));
  expect(fill).toHaveBeenCalledOnce();
  expect(screen.getAllByText("Non renseigné").length).toBeGreaterThan(0);
  expect(screen.getByText("Aucune")).toBeTruthy();
  rerender(<OrderDeliveryCard order={order} canSettle toReverse={25000} />);
  expect(screen.queryByRole("button", { name: "Renseigner" })).toBeNull();
});
