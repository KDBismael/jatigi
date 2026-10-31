import { expect, it } from "vitest";
import { productionChecks, schemaProbes } from "@/lib/production-readiness.mjs";
it("never reports an empty deployment configuration as ready or leaks secret values", () => {
  const checks = productionChecks({});
  expect(checks.filter((c) => !c.ok).length).toBeGreaterThan(5);
  expect(checks.find((c) => c.id === "MONERIZ_MODE")?.ok).toBe(false);
});
it("refuses local HTTP callback URLs and a test mode for a public launch", () => {
  const checks = productionChecks({
    APP_BASE_URL: "http://localhost:3000",
    MONERIZ_MODE: "test",
    MONERIZ_TEST_SECRET_KEY: "izp_test_sk_secret-value",
  });
  expect(checks.find((c) => c.id === "APP_BASE_URL")?.ok).toBe(false);
  expect(checks.find((c) => c.id === "MONERIZ_MODE")?.ok).toBe(false);
  expect(JSON.stringify(checks)).not.toContain("secret-value");
});
it("allows test keys only in explicit staging checks and rejects mismatched key mode", () => {
  expect(
    productionChecks(
      { MONERIZ_MODE: "test", MONERIZ_TEST_SECRET_KEY: "izp_test_sk_ok" },
      { allowTest: true },
    ).find((c) => c.id === "MONERIZ_MODE")?.ok,
  ).toBe(true);
  expect(
    productionChecks({
      MONERIZ_MODE: "live",
      MONERIZ_LIVE_SECRET_KEY: "izp_test_sk_wrong",
    }).find((c) => c.id === "MONERIZ_LIVE_SECRET_KEY")?.ok,
  ).toBe(false);
});

it("probes the actual composite payment key instead of a nonexistent id", () => {
  expect(schemaProbes.find(([table]) => table === "billing_payments")).toEqual([
    "billing_payments", "mode,payment_id",
  ]);
});
