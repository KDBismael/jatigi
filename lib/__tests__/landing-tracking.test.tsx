// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import * as analytics from "@/lib/analytics";
import { LandingTracking } from "@/components/landing/landing-tracking";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("tracks one delegated click on a nested CTA icon without collecting client data", () => {
  const track = vi.spyOn(analytics, "track");
  const view = (
    <div data-testid="landing-page">
      <LandingTracking />
      <a
        href="#hero"
        data-track="cta_signup"
        data-track-location="hero"
        data-plan="pro"
      >
        <svg data-testid="nested-icon" />
      </a>
    </div>
  );
  const { rerender } = render(view);
  rerender(view);
  fireEvent.click(screen.getByTestId("nested-icon"));
  expect(track).toHaveBeenCalledExactlyOnceWith("cta_signup", {
    location: "hero",
    plan: "pro",
  });
  cleanup();
  fireEvent.click(document.body);
  expect(track).toHaveBeenCalledTimes(1);
});
it("only reports to Warko's own events endpoint, never to a third party", () => {
  const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("navigator", { ...navigator, sendBeacon: undefined });
  vi.stubGlobal("fetch", fetcher);
  analytics.track("cta_signup", { location: "hero" });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe("/api/events");
});
