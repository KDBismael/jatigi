// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
afterEach(cleanup);
it("switches actual and comparison prices, keeps signup intent in the link", () => {
  render(<PricingSection />);
  expect(screen.getByTestId("pricing-price-pro").textContent?.replace(/\s/g, " ")).toBe("5 000");
  expect(screen.getByTestId("pricing-cta-pro").getAttribute("href")).toBe(
    "/auth/signup?plan=pro&cycle=monthly",
  );
  fireEvent.click(screen.getByTestId("pricing-toggle-annual"));
  expect(screen.getByTestId("pricing-cta-pro").getAttribute("href")).toBe("/auth/signup?plan=pro&cycle=yearly");
  expect(screen.getByTestId("pricing-price-pro").textContent?.replace(/\s/g, " ")).toBe("48 000");
  expect(screen.getByTestId("pricing-price-business").textContent?.replace(/\s/g, " ")).toBe(
    "96 000",
  );
  expect(screen.getByText("60 000")).toBeTruthy();
  expect(screen.getByText(/Économisez 12 000/)).toBeTruthy();
  expect(screen.getByTestId("pricing-plan-decouverte").textContent?.replace(/\s/g, " ")).toContain(
    "100",
  );
  fireEvent.click(screen.getByTestId("pricing-toggle-monthly"));
  expect(screen.getByTestId("pricing-price-pro").textContent?.replace(/\s/g, " ")).toBe("5 000");
});
it("starts with the first answer and never opens two FAQ answers", () => {
  render(<FaqSection />);
  expect(screen.getByTestId("faq-toggle-0").getAttribute("aria-expanded")).toBe(
    "true",
  );
  fireEvent.click(screen.getByTestId("faq-toggle-1"));
  expect(screen.queryByTestId("faq-answer-0")).toBeNull();
  expect(screen.getByTestId("faq-answer-1").textContent?.replace(/\s/g, " ")).toContain("100");
  fireEvent.click(screen.getByTestId("faq-toggle-1"));
  expect(screen.queryByTestId("faq-answer-1")).toBeNull();
});
