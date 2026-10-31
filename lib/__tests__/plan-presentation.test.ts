import { it, expect } from "vitest";
import {
  planFeatures,
  COMMON_PLAN_FEATURES,
} from "@/lib/billing/plan-presentation";
it("uses complete plan labels and leaves shared features outside plan differences", () => {
  expect(planFeatures("discovery")).toContain("100 commandes par mois");
  expect(planFeatures("discovery")).toContain("1 livreur");
  expect(planFeatures("pro")).toContain("5 livreurs");
  expect(planFeatures("business")).toContain("Livreurs illimités");
  expect(planFeatures("business")).toContain("Utilisateurs illimités");
  for (const p of ["discovery", "pro", "business"] as const)
    expect(planFeatures(p).join(" ")).not.toMatch(
      /Sessions live|Catalogue, stock/,
    );
  expect(COMMON_PLAN_FEATURES).toContain("Sessions live");
  expect(COMMON_PLAN_FEATURES).toContain("Catalogue, stock et dépenses");
});
