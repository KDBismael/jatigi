"use client";
import { useSubscription } from "@/hooks/use-subscription";
import { PLANS } from "@/lib/billing/plans";
export function PlanNavBadge() {
  const { summary } = useSubscription();
  return summary && summary.plan !== "discovery" ? (
    <span className="shrink-0 rounded-full border border-gold bg-gold-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold-soft">
      {PLANS[summary.plan].name}
    </span>
  ) : null;
}
