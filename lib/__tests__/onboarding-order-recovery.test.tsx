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
const create = vi.hoisted(() => vi.fn());
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: () => ({ profile: { role: "admin" } }),
}));
vi.mock("@/hooks/use-products", () => ({
  useProducts: () => ({ products: [{ id: "p" }], create: vi.fn() }),
}));
vi.mock("@/hooks/use-delivery-drivers", () => ({
  useDeliveryDrivers: () => ({ drivers: [{ id: "d" }], create: vi.fn() }),
}));
vi.mock("@/hooks/use-orders", () => ({ useOrders: () => ({ create }) }));
vi.mock("@/hooks/use-order-options", () => ({
  useOrderOptions: () => ({ sellers: [], lives: [] }),
}));
vi.mock("@/components/orders/order-form", () => ({
  OrderForm: ({ onSubmit }: { onSubmit: (data: object) => void }) => (
    <button onClick={() => onSubmit({ client_name: "QA" })}>
      Enregistrer commande réelle
    </button>
  ),
}));
import { OnboardingWizard } from "@/components/onboarding/wizard";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("retries only loading progress when the first order already succeeded", async () => {
  create.mockResolvedValue({ id: "o" });
  let reads = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      reads++;
      return reads === 2
        ? Response.json({ error: "offline" }, { status: 503 })
        : Response.json({
            step: 3,
            completed: { product: true, driver: true, order: reads > 2 },
            complete: reads > 2,
            skipped_steps: [],
          });
    }),
  );
  render(<OnboardingWizard />);
  fireEvent.click(await screen.findByText("Enregistrer commande réelle"));
  await screen.findByRole("alert");
  expect(screen.queryByText("Enregistrer commande réelle")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Reprendre la configuration" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Votre boutique est prête !")).toBeTruthy(),
  );
  expect(create).toHaveBeenCalledOnce();
});
