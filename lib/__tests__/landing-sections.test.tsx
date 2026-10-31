// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturesSection } from "@/components/landing/features-section";
import { Testimonial } from "@/components/landing/testimonial";
afterEach(cleanup);
it("keeps all static section hooks and displays the supplied customer testimonial", () => {
  render(
    <>
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <FeaturesSection />
      <Testimonial />
    </>,
  );
  for (const key of [
    "problem-card-money",
    "problem-card-disputes",
    "problem-card-profit",
    ...["riders", "orders", "profit", "stock", "team"].map(
      (x) => `solution-row-${x}`,
    ),
    ...[
      "orders",
      "riders",
      "stock",
      "live",
      "expenses",
      "print",
      "roles",
      "mobile",
    ].map((x) => `feature-${x}`),
    ...["1", "2", "3", "4"].map((x) => `step-${x}`),
  ])
    expect(screen.getByTestId(key)).toBeTruthy();
  const testimonial = screen.getByTestId("testimonial-card");
  expect(testimonial.textContent).toContain("Mondesire Abesse");
  expect(testimonial.querySelector("blockquote")?.textContent).toBe(
    "« Avant, chaque soir je m'asseyais avec cahier et calculatrice pour savoir qui a payé, qui doit, combien de colis sont sortis… Ça me prenait des heures et à la fin ça tombait même pas juste. Maintenant avec Warko, tout est déjà là. Je regarde mon bilan en deux minutes et je dors tranquille. »",
  );
  expect(testimonial.textContent).not.toMatch(/\[|à remplacer/);
});
