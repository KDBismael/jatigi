// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import { SubscriptionProvider } from "@/components/billing/subscription-provider";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuthStore } from "@/stores/auth-store";
function scope(id: string) {
  useAuthStore.setState({
    profile: {
      id: "user-" + id,
      organization_id: id,
      role: "admin",
      full_name: "Awa",
      phone: null,
      created_at: "",
    },
    organization: { id, name: id, created_at: "" },
  });
}
function Consumer() {
  const { summary, isLoading } = useSubscription();
  return <p>{isLoading ? "Chargement" : (summary?.plan ?? "Vide")}</p>;
}
beforeEach(() => scope("one"));
afterEach(() => {
  cleanup();
  useAuthStore.getState().clear();
  vi.unstubAllGlobals();
});
it("shares a single request across consumers and deduplicates overlapping refreshes", async () => {
  const fetch = vi.fn(async () => Response.json({ plan: "pro", payments: [] }));
  vi.stubGlobal("fetch", fetch);
  let refresh!: () => Promise<void>;
  function Refresher() {
    const state = useSubscription();
    React.useEffect(() => {
      refresh = state.refresh;
    }, [state.refresh]);
    return null;
  }
  render(
    <SubscriptionProvider>
      <Consumer />
      <Consumer />
      <Refresher />
    </SubscriptionProvider>,
  );
  await waitFor(() => expect(screen.getAllByText("pro")).toHaveLength(2));
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(() => Promise.all([refresh(), refresh()]));
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("clears old shop data immediately and ignores its delayed response", async () => {
  let resolve!: (r: Response) => void;
  const fetch = vi
    .fn()
    .mockImplementationOnce(() => new Promise<Response>((r) => (resolve = r)))
    .mockResolvedValue(Response.json({ plan: "business", payments: [] }));
  vi.stubGlobal("fetch", fetch);
  render(
    <SubscriptionProvider>
      <Consumer />
    </SubscriptionProvider>,
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  act(() => scope("two"));
  await waitFor(() => expect(screen.getByText("business")).toBeTruthy());
  await act(async () => resolve(Response.json({ plan: "pro", payments: [] })));
  expect(screen.queryByText("pro")).toBeNull();
  act(() => useAuthStore.getState().clear());
  expect(screen.queryByText("business")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("does not fetch before membership is known", () => {
  useAuthStore.getState().clear();
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(
    <SubscriptionProvider>
      <Consumer />
    </SubscriptionProvider>,
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("hides a loaded subscription during the next shop loading state", async () => {
  let resolve!: (r: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ plan: "pro", payments: [] }))
      .mockImplementationOnce(
        () => new Promise<Response>((r) => (resolve = r)),
      ),
  );
  render(
    <SubscriptionProvider>
      <Consumer />
    </SubscriptionProvider>,
  );
  await waitFor(() => expect(screen.getByText("pro")).toBeTruthy());
  act(() => scope("two"));
  expect(screen.queryByText("pro")).toBeNull();
  expect(screen.getByText("Chargement")).toBeTruthy();
  await waitFor(() => expect(resolve).toBeTypeOf("function"));
  await act(async () =>
    resolve(Response.json({ plan: "business", payments: [] })),
  );
  expect(screen.getByText("business")).toBeTruthy();
});
it("shares the mutation lock across consumers to avoid duplicate charges", async () => {
  let checkout!: (plan: "pro" | "business", cycle: "monthly") => Promise<void>;
  const fetch = vi.fn(async (url: string) =>
    url.endsWith("/checkout")
      ? Response.json({ error: "En attente" }, { status: 409 })
      : Response.json({ plan: "discovery", payments: [] }),
  );
  vi.stubGlobal("fetch", fetch);
  function Actions() {
    const state = useSubscription();
    React.useEffect(() => {
      checkout = state.checkout;
    }, [state.checkout]);
    return null;
  }
  render(
    <SubscriptionProvider>
      <Consumer />
      <Actions />
    </SubscriptionProvider>,
  );
  await waitFor(() => expect(screen.getByText("discovery")).toBeTruthy());
  await act(() =>
    Promise.all([checkout("pro", "monthly"), checkout("pro", "monthly")]),
  );
  expect(
    fetch.mock.calls.filter(([url]) => url.endsWith("/checkout")),
  ).toHaveLength(1);
});
it("deduplicates the initial read in React StrictMode", async () => {
  const fetch = vi.fn(async () => Response.json({ plan: "pro", payments: [] }));
  vi.stubGlobal("fetch", fetch);
  render(
    <React.StrictMode>
      <SubscriptionProvider>
        <Consumer />
        <Consumer />
      </SubscriptionProvider>
    </React.StrictMode>,
  );
  await waitFor(() => expect(screen.getAllByText("pro")).toHaveLength(2));
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("does not reuse membership from a previous signed-in user", async () => {
  useAuthStore.setState({
    user: { id: "a-new-user" } as NonNullable<
      ReturnType<typeof useAuthStore.getState>["user"]
    >,
  });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(
    <SubscriptionProvider>
      <Consumer />
    </SubscriptionProvider>,
  );
  await act(async () => {});
  expect(fetch).not.toHaveBeenCalled();
});
it("refreshes after a mutation even if an older read is still pending", async () => {
  let resolve!: (r: Response) => void;
  let billing!: ReturnType<typeof useSubscription>;
  let reads = 0;
  const fetch = vi.fn(async (url: string) => {
    if (url === "/api/billing") {
      reads++;
      if (reads === 2) return new Promise<Response>((r) => (resolve = r));
      return Response.json({
        plan: reads === 1 ? "pro" : "business",
        payments: [],
      });
    }
    return Response.json({ ok: true });
  });
  vi.stubGlobal("fetch", fetch);
  function Actions() {
    const state = useSubscription();
    React.useEffect(() => {
      billing = state;
    }, [state]);
    return null;
  }
  render(
    <SubscriptionProvider>
      <Consumer />
      <Actions />
    </SubscriptionProvider>,
  );
  await waitFor(() => expect(screen.getByText("pro")).toBeTruthy());
  let refresh!: Promise<void>;
  act(() => {
    refresh = billing.refresh();
  });
  await waitFor(() => expect(reads).toBe(2));
  let action!: Promise<void>;
  act(() => {
    action = billing.action("resume");
  });
  await act(async () => {
    resolve(Response.json({ plan: "pro", payments: [] }));
    await Promise.all([refresh, action]);
  });
  expect(screen.getByText("business")).toBeTruthy();
  expect(reads).toBe(3);
});
