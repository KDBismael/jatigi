// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import DeliveriesPage from "@/app/(app)/deliveries/page";
const mocks = vi.hoisted(() => ({ settle: vi.fn() }));
vi.mock("@/hooks/use-subscription", () => ({useSubscription:()=>({summary:{plan:"pro"}})}));
vi.mock("@/hooks/use-role", () => ({
  useRole: () => ({ isAdmin: false, canManageDeliveries: true }),
}));
vi.mock("@/hooks/use-delivery-drivers", () => ({
  useDeliveryDrivers: () => ({
    drivers: [
      {
        id: "d",
        name: "Koffi",
        is_active: true,
        amount_due: 2000,
        packages_in_progress: 1,
        packages_delivered: 1,
        amount_collected: 9500,
        amount_remitted: 7500,
      },
    ],
    isLoading: false,
    settle: mocks.settle,
  }),
}));
vi.mock("@/components/deliveries/daily-delivery-balance", () => ({
  DailyDeliveryBalance: ({
    onSettle,
    refreshKey,
  }: {
    onSettle: (id: string) => void;
    refreshKey: number;
  }) => (
    <>
      <button onClick={() => onSettle("d")}>Reversement Koffi</button>
      <p>Actualisation {refreshKey}</p>
    </>
  ),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("opens the right driver from the daily view, uses global balance and refreshes after success", async () => {
  mocks.settle.mockResolvedValue({});
  render(<DeliveriesPage />);
  fireEvent.click(screen.getByText("Reversement Koffi"));
  const amount = screen.getByLabelText(
    "Montant reversé (FCFA)",
  ) as HTMLInputElement;
  expect(amount.value).toBe("");
  expect(amount.max).toBe("2000");
  fireEvent.change(amount, { target: { value: "7500" } });
  fireEvent.submit(screen.getByRole("form", { name: "Reversement de Koffi" }));
  expect(mocks.settle).not.toHaveBeenCalled();
  fireEvent.change(amount, { target: { value: "1500" } });
  fireEvent.change(screen.getByLabelText("Date du reversement"), {
    target: { value: "2026-10-30" },
  });
  fireEvent.submit(screen.getByRole("form", { name: "Reversement de Koffi" }));
  await waitFor(() =>
    expect(mocks.settle).toHaveBeenCalledWith("d", {
      amount: 1500,
      settled_at: "2026-10-30",
      note: "",
    }),
  );
  await screen.findByText("Actualisation 1");
  expect(screen.queryByRole("form")).toBeNull();
});

it("brings the form into view, focuses the amount and keeps server refusals inside the form", async () => {
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  mocks.settle.mockRejectedValue(new Error("Le versement ne peut pas dépasser le solde dû de 1800 FCFA."));
  render(<DeliveriesPage />);
  fireEvent.click(screen.getByText("Reversement Koffi"));
  const form = screen.getByRole("form", { name: "Reversement de Koffi" });
  const amount = screen.getByLabelText("Montant reversé (FCFA)");
  expect(scroll).toHaveBeenCalled();
  expect(document.activeElement).toBe(amount);
  fireEvent.change(amount, { target: { value: "1900" } });
  fireEvent.submit(form);
  const alert = await screen.findByText("Le versement ne peut pas dépasser le solde dû de 1800 FCFA.");
  expect(form.contains(alert)).toBe(true);
  expect(screen.getAllByText("Le versement ne peut pas dépasser le solde dû de 1800 FCFA.")).toHaveLength(1);
});
