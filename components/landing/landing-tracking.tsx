"use client";
import { useEffect } from "react";
import { track, type AnalyticsProps } from "@/lib/analytics";
export function LandingTracking() {
  useEffect(() => {
    function click(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>("[data-track]");
      if (!target?.closest('[data-testid="landing-page"]')) return;
      const name = target.dataset.track;
      if (!name) return;
      const props: AnalyticsProps = {};
      for (const [key, value] of [
        ["location", target.dataset.trackLocation],
        ["value", target.dataset.trackValue],
        ["plan", target.dataset.plan],
      ] as const)
        if (value !== undefined) props[key] = value;
      track(name, props);
    }
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return null;
}
