import { it, expect } from "vitest";
import { PLANS } from "@/lib/billing/plans";
it("offers 100 Discovery orders and keeps launch comparison prices separate from charges", () => {
  expect(PLANS.discovery.ordersPerMonth).toBe(100);
  expect(PLANS.pro).toMatchObject({
    monthly: 5000,
    yearly: 48000,
    launchCompareAt: { monthly: 7000, yearly: 60000 },
  });
  expect(PLANS.business).toMatchObject({
    monthly: 10000,
    yearly: 96000,
    launchCompareAt: { monthly: 15000, yearly: 120000 },
  });
  expect(PLANS.pro.monthly * 12 - PLANS.pro.yearly).toBe(12000);
});

it("includes live sessions in every plan", () => {
  for (const plan of Object.values(PLANS)) expect(plan.liveSessions).toBe(true);
});
