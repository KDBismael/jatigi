// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import LandingPage from "@/app/(landing)/page";
import { SHOWCASE_ORDERS } from "@/components/landing/showcase-data";
afterEach(cleanup);
it("uses interface examples instead of stock icons and keeps the supplied testimonial", () => {
  render(<LandingPage />);
  for (const id of [
    "problem-card-money",
    "problem-card-disputes",
    "problem-card-profit",
    "solution-row-riders",
    "solution-row-orders",
    "solution-row-profit",
    "solution-row-stock",
    "solution-row-team",
    "feature-orders",
    "feature-riders",
    "feature-stock",
    "feature-live",
    "feature-expenses",
    "feature-print",
    "feature-roles",
    "feature-mobile",
    "testimonial-card",
  ])
    expect(screen.getByTestId(id).querySelector("svg"), id).toBeNull();
  expect(screen.getByText("Il reste")).toBeTruthy();
  expect(screen.getByText("Aucune idée")).toBeTruthy();
  expect(screen.getByText("Tu me dois encore 28 000.")).toBeTruthy();
  expect(screen.getAllByText("Avec Warko")).toHaveLength(5);
  expect(screen.getByText("+ 60 000 FCFA")).toBeTruthy();
  expect(screen.getByText("saisi par Awa")).toBeTruthy();
  expect(screen.getByText("71 %")).toBeTruthy();
  expect(screen.getByText("Mondesire Abesse")).toBeTruthy();
});
it("keeps wording, pricing lists, CTA hooks and round counts consistent", () => {
  const { container } = render(<LandingPage />);
  expect(container.textContent).not.toMatch(
    /—|--|__|Le plus populaire|Reste à reverser|Bilan livreurs/,
  );
  expect(screen.getByTestId("cta-hero-product").getAttribute("href")).toBe(
    "#produit",
  );
  expect(screen.queryByTestId("cta-hero-how")).toBeNull();
  expect(screen.getByText("Reste dû ce soir")).toBeTruthy();
  expect(screen.getByTestId("showcase-tab-deliveries").textContent).toBe(
    "Livraisons",
  );
  expect(screen.getByText("Recommandé")).toBeTruthy();
  for (const p of ["decouverte", "pro", "business"]) {
    expect(
      screen.getByTestId(`pricing-plan-${p}`).querySelectorAll("li"),
    ).toHaveLength(5);
    expect(screen.getByTestId(`pricing-cta-${p}`).textContent).toBe(
      "Essayer gratuitement",
    );
    expect(
      screen.getByTestId(`pricing-cta-${p}`).querySelector("svg"),
    ).toBeNull();
  }
  expect(screen.getByText(/inclus dans tous les plans/)).toBeTruthy();
  expect(screen.getByText("Comment payer mon abonnement ?")).toBeTruthy();
  expect(SHOWCASE_ORDERS.find((o) => o.client === "Awa S.")?.driver).toBe(
    "Non assigné",
  );
  fireEvent.click(screen.getByTestId("showcase-tab-deliveries"));
  expect(screen.getByText("6 autres commandes sur cette tournée")).toBeTruthy();
  fireEvent.click(screen.getByTestId("showcase-driver-ibrahim"));
  expect(screen.getByText("3 autres commandes sur cette tournée")).toBeTruthy();
  fireEvent.click(screen.getByTestId("showcase-driver-serge"));
  expect(screen.getByText("5 autres commandes sur cette tournée")).toBeTruthy();
});

it("lists live sessions as a shared feature instead of a paid-plan difference", () => {
  render(<LandingPage />);
  for (const p of ["decouverte", "pro", "business"])
    expect(screen.getByTestId(`pricing-plan-${p}`).textContent).not.toContain(
      "Sessions live",
    );
  expect(
    screen.getByText(/Sessions live.*inclus dans tous les plans/),
  ).toBeTruthy();
});
