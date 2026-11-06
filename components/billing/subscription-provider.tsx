"use client";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BILLING_USAGE_CHANGED } from "@/lib/billing/usage-events";
import { useAuthStore } from "@/stores/auth-store";
import type {
  BillingCycle,
  PlanId,
  SubscriptionSummary,
} from "@/lib/billing/plans";
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Une erreur est survenue. Réessayez.");
  return data;
}
function useSubscriptionController(enabled: boolean) {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [isLoading, setLoading] = useState(true);
  const active = useRef(true);
  const loadingRequest = useRef<Promise<void> | null>(null);
  const mutation = useRef(false);
  const refresh = useCallback((): Promise<void> => {
    if (!enabled || !active.current) return Promise.resolve();
    if (loadingRequest.current) return loadingRequest.current;
    const pending = (async () => {
      try {
        const next = await request<SubscriptionSummary>("/api/billing");
        if (active.current) {
          setSummary(next);
          setError(null);
        }
      } catch (e) {
        if (active.current) setError((e as Error).message);
      } finally {
        if (active.current) setLoading(false);
        loadingRequest.current = null;
      }
    })();
    loadingRequest.current = pending;
    return pending;
  }, [enabled]);
  useEffect(() => {
    active.current = true;
    void Promise.resolve().then(refresh);
    return () => {
      active.current = false;
    };
  }, [refresh]);
  useEffect(() => {
    const updateUsage = async () => {
      // A write may finish while the initial read is still in flight.
      if (loadingRequest.current) await loadingRequest.current;
      await refresh();
    };
    const handleChange = () => { void updateUsage(); };
    window.addEventListener(BILLING_USAGE_CHANGED, handleChange);
    return () => window.removeEventListener(BILLING_USAGE_CHANGED, handleChange);
  }, [refresh]);
  useEffect(() => {
    if (
      !summary?.payments.some((p) =>
        ["pending", "processing"].includes(p.state),
      )
    )
      return;
    const timer = setInterval(() => void refresh(), 10000);
    return () => clearInterval(timer);
  }, [summary, refresh]);
  const run = async (task: () => Promise<void>) => {
    if (!enabled || !active.current || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      if (active.current) setError((e as Error).message);
    } finally {
      mutation.current = false;
      if (active.current) setBusy(false);
    }
  };
  const refreshAfterMutation = async () => {
    if (loadingRequest.current) await loadingRequest.current;
    await refresh();
  };
  const checkout = (plan: "pro" | "business", cycle: BillingCycle) =>
    run(async () => {
      const result = await request<{
        checkoutUrl: string | null;
        state: string;
      }>("/api/billing/checkout", { plan, cycle });
      if (!active.current) return;
      if (result.checkoutUrl) {
        const url = new URL(result.checkoutUrl);
        if (url.protocol !== "https:")
          throw new Error("Lien de paiement invalide.");
        window.location.assign(url.href);
      } else {
        await refreshAfterMutation();
        if (active.current && result.state !== "paid")
          setError(
            "Paiement en attente de vérification. Ne payez pas une seconde fois.",
          );
      }
    });
  const action = (action: "cancel" | "resume" | "downgrade", plan?: PlanId) =>
    run(async () => {
      await request("/api/billing/subscription", { action, plan });
      await refreshAfterMutation();
    });
  const reconcile = (invoiceId: string) =>
    run(async () => {
      await request("/api/billing/reconcile", { invoiceId });
      await refreshAfterMutation();
    });
  return {
    summary,
    error,
    busy,
    isLoading,
    refresh,
    checkout,
    action,
    reconcile,
  };
}

type SubscriptionState = ReturnType<typeof useSubscriptionController>;
const SubscriptionContext = createContext<SubscriptionState | null>(null);
function ScopedSubscriptionProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const state = useSubscriptionController(enabled);
  return (
    <SubscriptionContext.Provider value={state}>
      {children}
    </SubscriptionContext.Provider>
  );
}
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);
  const organizationId = useAuthStore((s) => s.organization?.id);
  const enabled =
    !!profile &&
    profile.organization_id === organizationId &&
    (!userId || userId === profile.id);
  const scope = enabled
    ? `${userId ?? profile.id}:${profile.id}:${organizationId}:${profile.role}`
    : "anonymous";
  return (
    <ScopedSubscriptionProvider key={scope} enabled={enabled}>
      {children}
    </ScopedSubscriptionProvider>
  );
}
export function useSubscription() {
  const state = useContext(SubscriptionContext);
  if (!state)
    throw new Error(
      "useSubscription doit être utilisé dans SubscriptionProvider.",
    );
  return state;
}
