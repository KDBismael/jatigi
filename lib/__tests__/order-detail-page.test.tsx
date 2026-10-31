// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Page from "@/app/(app)/orders/[id]/page";
import { useAuthStore } from "@/stores/auth-store";
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "o" }),
  useRouter: () => ({ back: vi.fn() }),
}));
vi.mock("@/hooks/use-delivery-drivers", () => ({
  useDeliveryDrivers: () => ({
    drivers: [{ id: "d", name: "Koffi", is_active: true }],
  }),
}));
vi.mock("@/hooks/use-order-options", () => ({
  useOrderOptions: () => ({ sellers: [], lives: [] }),
}));
vi.mock("@/components/orders/discount-editor", () => ({
  DiscountEditor: () => <p>Éditeur de remises</p>,
}));
const order = {
  id: "o",
  client_name: "Awa",
  client_phone: "0700000000",
  status: "in_progress",
  channel: "whatsapp",
  order_date: "2026-10-30",
  delivery_driver_id: "d",
  delivery_driver: { name: "Koffi" },
  delivery_date: null,
  delivery_fee: 1500,
  confirmation_amount: 0,
  order_lines: [],
};
beforeEach(() =>
  useAuthStore.setState({
    profile: {
      id: "u",
      full_name: "Awa",
      organization_id: "org",
      role: "admin",
      phone: null,
      created_at: "",
    },
  }),
);
afterEach(() => {
  cleanup();
  useAuthStore.getState().clear();
  vi.unstubAllGlobals();
});
it("opens and focuses the missing tour date through the existing edit form", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(order)),
  );
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Renseigner" }));
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByLabelText("Date de tournée"),
    ),
  );
  expect(
    (screen.getByLabelText("Date de tournée") as HTMLInputElement).disabled,
  ).toBe(false);
});
it("keeps an existing date and driver locked on a delivered order", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        ...order,
        status: "delivered",
        delivery_date: "2026-10-29",
      }),
    ),
  );
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));
  expect(
    (screen.getByLabelText("Date de tournée") as HTMLInputElement).disabled,
  ).toBe(true);
  expect(
    (screen.getByLabelText("Livreur assigné") as HTMLSelectElement).disabled,
  ).toBe(true);
});
it("keeps manager status/print access without general edit or costs", async () => {
  useAuthStore.setState({
    profile: {
      id: "u",
      full_name: "Awa",
      organization_id: "org",
      role: "manager",
      phone: null,
      created_at: "",
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(order)),
  );
  render(<Page />);
  expect(await screen.findByRole("link", { name: "Imprimer" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Modifier" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Renseigner" })).toBeNull();
  expect(screen.queryByText("Éditeur de remises")).toBeNull();
  expect(screen.queryByText(/Coût d’achat/)).toBeNull();
});
it("renders an API failure instead of treating the error payload as an order", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: "Accès refusé" }, { status: 403 }),
    ),
  );
  render(<Page />);
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Accès refusé",
  );
  expect(screen.queryByRole("link", { name: "Imprimer" })).toBeNull();
});
it("keeps edits visible and reports an offline save failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      if (options?.method === "PUT") throw new Error("offline");
      return Response.json({ ...order, delivery_date: "2026-10-30" });
    }),
  );
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Connexion impossible. Réessayez.",
  );
  expect(
    screen.getByRole("heading", { name: "Modifier la commande" }),
  ).toBeTruthy();
});
it("shows staff sale prices and net line totals while hiding purchase costs and profits", async () => {
  useAuthStore.setState({
    profile: {
      id: "u",
      full_name: "Awa",
      organization_id: "org",
      role: "employee",
      phone: null,
      created_at: "",
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        ...order,
        order_lines: [
          {
            id: "line",
            quantity: 2,
            unit_price: 5000,
            line_total: 9000,
            discount_amount: 1000,
            discount_reason: "Promotion",
            unit_cost: 1000,
            total_cost: 2000,
            product: { name: "Robe" },
          },
        ],
      }),
    ),
  );
  render(<Page />);
  await screen.findByRole("link", { name: "Imprimer" });
  expect(screen.getAllByText("Prix unit.").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/9.?000/).length).toBeGreaterThan(0);
  expect(screen.queryByText("Coût unit.")).toBeNull();
  expect(screen.queryByText("Bénéfice")).toBeNull();
});
