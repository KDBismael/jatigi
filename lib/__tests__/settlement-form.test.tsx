// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SettlementForm } from "@/components/deliveries/settlement-form";
afterEach(cleanup);
it("rejects an amount above the global balance and retains the actual payment date", () => {
  const submit = vi.fn(),
    change = vi.fn();
  const props = {
    driverName: "Koffi",
    maxAmount: 2000,
    date: "2026-10-30",
    amount: "7500",
    busy: false,
    onDateChange: change,
    onAmountChange: change,
    onSubmit: submit,
    onCancel: vi.fn(),
  };
  const { rerender } = render(<SettlementForm {...props} />);
  fireEvent.submit(screen.getByRole("form"));
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toContain("solde");
  rerender(<SettlementForm {...props} amount="1500" />);
  fireEvent.submit(screen.getByRole("form"));
  expect(submit).toHaveBeenCalledOnce();
  expect(
    (screen.getByLabelText("Date du reversement") as HTMLInputElement).value,
  ).toBe("2026-10-30");
});
