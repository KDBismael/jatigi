import { it, expect } from "vitest";
import {
  SHOWCASE_DRIVERS,
  deliveryTotals,
} from "@/components/landing/showcase-data";
it("keeps collected money, retained fees, remittances and remaining dues consistent", () => {
  for (const driver of SHOWCASE_DRIVERS)
    expect(driver.collected - driver.fees - driver.remitted).toBe(driver.due);
  expect(SHOWCASE_DRIVERS[0]).toMatchObject({
    collected: 96000,
    fees: 8000,
    remitted: 60000,
    due: 28000,
  });
  expect(deliveryTotals).toEqual({
    collected: 214000,
    fees: 19000,
    expected: 195000,
    remitted: 152500,
    due: 42500,
  });
});
