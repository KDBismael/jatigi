import { AuthForm } from "@/components/auth/auth-form";
import type { PlanId } from "@/lib/billing/plans";
import { TrackView } from "@/components/analytics/track-view";
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[]; cycle?: string | string[] }>;
}) {
  const { plan, cycle } = await searchParams;
  const selectedPlan: PlanId | undefined =
    plan === "decouverte"
      ? "discovery"
      : plan === "pro" || plan === "business"
        ? plan
        : undefined;
  return <><TrackView event="signup_view" /><AuthForm initialMode="signup" selectedPlan={selectedPlan} selectedCycle={cycle === "yearly" ? "yearly" : "monthly"} /></>;
}
