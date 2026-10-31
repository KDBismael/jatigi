// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppBottomNav } from "@/components/layout/app-bottom-nav";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { navigationFor, isNavigationActive } from "@/lib/navigation";
import { useAuthStore } from "@/stores/auth-store";
import type { Role } from "@/lib/constants";
const route = vi.hoisted(() => ({ path: "/orders/123" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.path }));
function role(value: Role | null) {
  useAuthStore.setState({
    profile: value
      ? {
          id: "u",
          organization_id: "o",
          full_name: "Awa Koné",
          role: value,
          phone: null,
          created_at: "",
        }
      : null,
    organization: value
      ? {
          id: "o",
          name: "Une boutique avec un nom particulièrement long",
          created_at: "",
        }
      : null,
  });
}
beforeEach(() => {
  role("admin");
  route.path = "/orders/123";
});
afterEach(() => {
  cleanup();
  useAuthStore.getState().clear();
});
it.each([
  ["admin", ["Tableau", "Commandes", "Livraisons", "Produits", "Plus"]],
  ["manager", ["Commandes", "Livraisons", "Plus"]],
  ["employee", ["Commandes", "Plus"]],
] as const)(
  "renders only accessible mobile entries for %s",
  (value, labels) => {
    role(value);
    render(<AppBottomNav />);
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(
      labels,
    );
    expect(
      screen
        .getByRole("link", { name: "Commandes" })
        .getAttribute("aria-current"),
    ).toBe("page");
  },
);
it("selects Plus on secondary routes and respects segment boundaries", () => {
  route.path = "/analytics";
  render(<AppBottomNav />);
  expect(
    screen.getByRole("link", { name: "Plus" }).getAttribute("aria-current"),
  ).toBe("page");
  expect(isNavigationActive("/orders-archive", "/orders")).toBe(false);
  expect(navigationFor(null)).toEqual([]);
});
it("never flashes admin links before the role loads", () => {
  role(null);
  render(<AppBottomNav />);
  expect(screen.queryAllByRole("link")).toHaveLength(0);
  expect(screen.getByRole("status").textContent).toContain("Chargement");
});
it("shows the shop, real logo and accessible account link", () => {
  render(<AppTopBar />);
  expect(screen.getByText(/Une boutique/)).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Mon compte" }).getAttribute("href"),
  ).toBe("/account");
  expect(document.querySelector("img")?.getAttribute("src")).toBe("/icon.svg");
});
