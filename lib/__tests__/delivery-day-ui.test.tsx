// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DeliveryDayCard } from "@/components/deliveries/delivery-day-card";
import type { DeliveryDayDriver } from "@/types/delivery-balance";
afterEach(cleanup);
const driver: DeliveryDayDriver = {
  driverId: "d",
  driverName: "Koffi",
  isActive: false,
  counts: { delivered: 1, in_progress: 2, cancelled: 0, postponed: 1 },
  expectedRemittance: 7500,
  globalAmountDue: 9000,
  remittedOnDate: 2000,
  orders: [
    {
      assignmentId: "a",
      orderId: "o",
      clientName: "Awa",
      clientPhone: "0700000000",
      products: "Robe",
      status: "delivered",
      remittableAmount: 7500,
    },
  ],
};
it("opens the full driver header and keeps the actual global due visible while closed", () => {
  const toggle = vi.fn(),
    settle = vi.fn();
  const { rerender } = render(
    <DeliveryDayCard
      driver={driver}
      open={false}
      detailsId="details"
      onToggle={toggle}
      onSettle={settle}
    />,
  );
  expect(screen.getByText(/9.?000/)).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Awa" })).toBeNull();
  const header = screen.getByTestId("delivery-driver-toggle");
  expect(header.querySelector("button")).toBeNull();
  fireEvent.click(header);
  expect(toggle).toHaveBeenCalledOnce();
  rerender(
    <DeliveryDayCard
      driver={driver}
      open
      detailsId="details"
      onToggle={toggle}
      onSettle={settle}
    />,
  );
  expect(screen.getByRole("link", { name: "Awa" }).getAttribute("href")).toBe(
    "/orders/o",
  );
  expect(
    screen.getByTestId("delivery-driver-toggle").getAttribute("aria-expanded"),
  ).toBe("true");
  fireEvent.click(
    screen.getByRole("button", { name: /Enregistrer un reversement/ }),
  );
  expect(settle).toHaveBeenCalledWith("d");
});
it("does not offer payment when no current global balance is available", () => {
  render(
    <DeliveryDayCard
      driver={{ ...driver, globalAmountDue: undefined }}
      open={false}
      detailsId="details"
      onToggle={() => {}}
      onSettle={vi.fn()}
    />,
  );
  expect(
    screen.queryByRole("button", { name: /Enregistrer un reversement/ }),
  ).toBeNull();
  expect(screen.getByTestId("delivery-driver-toggle").textContent).toContain(
    "Non documenté",
  );
});
