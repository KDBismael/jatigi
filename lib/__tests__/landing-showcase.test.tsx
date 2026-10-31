// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { ProductShowcase } from "@/components/landing/product-showcase";
function motion(reduce = false) {
  vi.stubGlobal("matchMedia", () => ({
    matches: reduce,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("rotates at six seconds and stops permanently on manual choice", () => {
  vi.useFakeTimers();
  motion();
  render(<ProductShowcase />);
  expect(
    screen.getByTestId("showcase-tab-dashboard").getAttribute("aria-selected"),
  ).toBe("true");
  act(() => vi.advanceTimersByTime(6000));
  expect(
    screen.getByTestId("showcase-tab-orders").getAttribute("aria-selected"),
  ).toBe("true");
  fireEvent.click(screen.getByTestId("showcase-tab-deliveries"));
  act(() => vi.advanceTimersByTime(18000));
  expect(
    screen.getByTestId("showcase-tab-deliveries").getAttribute("aria-selected"),
  ).toBe("true");
  fireEvent.click(screen.getByTestId("showcase-driver-ibrahim"));
  expect(
    screen.getByTestId("showcase-driver-ibrahim").getAttribute("aria-expanded"),
  ).toBe("true");
});
it("does not rotate for reduced motion and filters orders", () => {
  vi.useFakeTimers();
  motion(true);
  render(<ProductShowcase />);
  act(() => vi.advanceTimersByTime(12000));
  expect(
    screen.getByTestId("showcase-tab-dashboard").getAttribute("aria-selected"),
  ).toBe("true");
  fireEvent.click(screen.getByTestId("showcase-tab-orders"));
  fireEvent.click(screen.getByTestId("showcase-filter-received"));
  expect(screen.getByTestId("showcase-order-list").textContent).toContain(
    "Fatim",
  );
  expect(screen.getByTestId("showcase-order-list").textContent).not.toContain(
    "Mariam",
  );
});
it("keeps content stable as soon as keyboard focus enters the showcase", () => {
  vi.useFakeTimers();
  motion();
  render(<ProductShowcase />);
  fireEvent.focus(screen.getByTestId("showcase-tab-dashboard"));
  act(() => vi.advanceTimersByTime(12000));
  expect(
    screen.getByTestId("showcase-tab-dashboard").getAttribute("aria-selected"),
  ).toBe("true");
});
it("reserves all caption heights without exposing inactive captions to screen readers", () => {
  motion(true);
  const { container } = render(<ProductShowcase />);
  const captions = container.querySelectorAll("[data-showcase-caption]");
  expect(captions).toHaveLength(3);
  expect(
    [...captions].filter((e) => e.getAttribute("aria-hidden") !== "true"),
  ).toHaveLength(1);
  fireEvent.click(screen.getByTestId("showcase-tab-deliveries"));
  expect(
    [...captions].filter((e) => e.getAttribute("aria-hidden") !== "true")[0]
      .textContent,
  ).toContain("Le bilan du jour");
});
it("stops rotation when the visitor scrolls inside the preview", () => {
  vi.useFakeTimers();
  motion();
  render(<ProductShowcase />);
  fireEvent.scroll(screen.getByRole("tabpanel"));
  act(() => vi.advanceTimersByTime(12000));
  expect(
    screen.getByTestId("showcase-tab-dashboard").getAttribute("aria-selected"),
  ).toBe("true");
});
