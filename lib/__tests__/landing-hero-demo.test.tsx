// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HeroDemo } from "@/components/landing/hero-demo";
afterEach(cleanup);
it("settles only the example and resets all amounts", () => {
  render(<HeroDemo />);
  expect(screen.getByTestId("hero-demo-due").textContent?.replace(/\s/g, " ")).toContain("42 500");
  fireEvent.click(screen.getByTestId("hero-demo-settle"));
  expect(screen.getByTestId("hero-demo-due").textContent?.replace(/\s/g, " ")).toContain("14 500");
  expect(screen.getByText(/Reversé 180 500/)).toBeTruthy();
  expect(screen.getByTestId("hero-demo-toast").getAttribute("role")).toBe(
    "status",
  );
  fireEvent.click(screen.getByTestId("hero-demo-reset"));
  expect(screen.getByTestId("hero-demo-due").textContent?.replace(/\s/g, " ")).toContain("42 500");
  expect(screen.getByText(/Reversé 152 500/)).toBeTruthy();
});
