// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PlanNavBadge } from "@/components/billing/plan-nav-badge";
import { MoreMenu } from "@/components/layout/more-menu";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { useAuthStore } from "@/stores/auth-store";
const billing = vi.hoisted(() => ({
  plan: "pro" as "pro" | "business" | "discovery",
}));
vi.mock("@/hooks/use-subscription", () => ({
  useSubscription: () => ({ summary: { plan: billing.plan } }),
}));
afterEach(() => {
  cleanup();
  billing.plan = "pro";
  useAuthStore.getState().clear();
  delete document.documentElement.dataset.warkoTheme;
  vi.unstubAllGlobals();
});
function setup(role: "admin" | "employee" | "manager") {
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
  useAuthStore.setState({
    profile: {
      id: "u",
      organization_id: "o",
      full_name: "Awa",
      role,
      phone: null,
      created_at: "",
    },
  });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  render(
    <ThemeProvider>
      <MoreMenu />
    </ThemeProvider>,
  );
}
it("groups admin destinations and posts logout to the existing endpoint", () => {
  setup("admin");
  for (const text of ["Pilotage", "Boutique", "Aide", "Abonnement"])
    expect(screen.getByText(text)).toBeTruthy();
  const form = screen
    .getByRole("button", { name: "Déconnexion" })
    .closest("form");
  expect(form?.getAttribute("method")).toBe("POST");
  expect(form?.getAttribute("action")).toBe("/api/auth/signout");
  expect(screen.getByText("Pro")).toBeTruthy();
});
it.each(["employee", "manager"] as const)(
  "keeps forbidden destinations hidden for %s",
  (role) => {
    setup(role);
    expect(
      screen.getAllByRole("link").map((a) => a.getAttribute("href")),
    ).toEqual(["/account", "/support"]);
    expect(screen.queryByText("Abonnement")).toBeNull();
    expect(screen.queryByText("Pilotage")).toBeNull();
  },
);
it("switches and persists the actual theme preference", () => {
  setup("employee");
  fireEvent.click(screen.getByRole("button", { name: "Sombre" }));
  expect(localStorage.getItem("warko-theme")).toBe("dark");
  expect(document.documentElement.dataset.warkoTheme).toBe("dark");
  expect(
    screen.getByRole("button", { name: "Sombre" }).getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Système" }));
  expect(document.documentElement.dataset.warkoTheme).toBe("light");
});

it("does not show a gold badge for Discovery", () => {
  billing.plan = "discovery";
  const { container } = render(<PlanNavBadge />);
  expect(container.innerHTML).toBe("");
});
it("uses the actual paid plan name in the navigation badge", () => {
  billing.plan = "business";
  render(<PlanNavBadge />);
  expect(screen.getByText("Business")).toBeTruthy();
});
