// @vitest-environment jsdom
import React from "react";
import { SubscriptionProvider } from "@/components/billing/subscription-provider";
import { useAuthStore } from "@/stores/auth-store";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { useSubscription } from "@/hooks/use-subscription";
beforeEach(() =>
  useAuthStore.setState({
    profile: {
      id: "u",
      organization_id: "o",
      full_name: "Awa",
      role: "admin",
      phone: null,
      created_at: "",
    },
    organization: { id: "o", name: "Démo", created_at: "" },
  }),
);
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SubscriptionProvider>{children}</SubscriptionProvider>
);
afterEach(() => {
  useAuthStore.getState().clear();
  cleanup();
  vi.unstubAllGlobals();
});
it("surfaces server payment error without automatically creating a second charge", async () => {
  let charges = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      if (String(url).endsWith("/checkout")) {
        charges++;
        return Response.json(
          { error: "Paiement expiré", code: "EXPIRED" },
          { status: 409 },
        );
      }
      return Response.json({ plan: "discovery", payments: [] });
    }),
  );
  const { result } = renderHook(() => useSubscription(), { wrapper });
  await waitFor(() => expect(result.current.summary).toBeTruthy());
  await act(() => result.current.checkout("pro", "monthly"));
  expect(result.current.error).toBe("Paiement expiré");
  expect(charges).toBe(1);
});
it("keeps stale data visible on failed refresh", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", async () =>
    ++calls === 1
      ? Response.json({ plan: "discovery", payments: [] })
      : Response.json({ error: "Indisponible" }, { status: 503 }),
  );
  const { result } = renderHook(() => useSubscription(), { wrapper });
  await waitFor(() => expect(result.current.summary).toBeTruthy());
  await act(() => result.current.refresh());
  expect(result.current.summary?.plan).toBe("discovery");
  expect(result.current.error).toBe("Indisponible");
});
