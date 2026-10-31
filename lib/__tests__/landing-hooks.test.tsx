// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import LandingPage from "@/app/(landing)/page";
afterEach(cleanup);
it("preserves every design hook across interactive states, tracks and section order", () => {
  const design = readFileSync(
    "docs/design/landing/landing-design.dc.html",
    "utf8",
  );
  const { container } = render(<LandingPage />);
  const ids = new Set<string>(),
    tracks = new Set<string>(),
    locations = new Set<string>();
  function capture() {
    container
      .querySelectorAll("[data-testid]")
      .forEach((e) => ids.add(e.getAttribute("data-testid")!));
    container
      .querySelectorAll("[data-track]")
      .forEach((e) => tracks.add(e.getAttribute("data-track")!));
    container
      .querySelectorAll("[data-track-location]")
      .forEach((e) => locations.add(e.getAttribute("data-track-location")!));
  }
  capture();
  fireEvent.click(screen.getByTestId("hero-demo-settle"));
  capture();
  fireEvent.click(screen.getByTestId("hero-demo-reset"));
  for (const key of ["dashboard", "orders", "deliveries"]) {
    fireEvent.click(screen.getByTestId(`showcase-tab-${key}`));
    capture();
  }
  for (let i = 0; i < 8; i++) {
    fireEvent.click(screen.getByTestId(`faq-toggle-${i}`));
    if (!screen.queryByTestId(`faq-answer-${i}`))
      fireEvent.click(screen.getByTestId(`faq-toggle-${i}`));
    capture();
  }
  for (const match of design.matchAll(/data-testid="([^"]+)"/g)) {
    const value = match[1];
    if (value.includes("{{")) continue;
    expect(ids.has(value), value).toBe(true);
  }
  for (const match of design.matchAll(/data-track="([^"]+)"/g))
    expect(tracks.has(match[1]), match[1]).toBe(true);
  for (const match of design.matchAll(/data-track-location="([^"]+)"/g))
    expect(locations.has(match[1]), match[1]).toBe(true);
  for (const key of ["dashboard", "orders", "deliveries"]) {
    expect(ids.has(`showcase-tab-${key}`)).toBe(true);
  }
  for (const key of [
    "all",
    "received",
    "confirmed",
    "in_progress",
    "delivered",
    "postponed",
  ])
    expect(ids.has(`showcase-filter-${key}`)).toBe(true);
  for (const key of ["koffi", "ibrahim", "serge"])
    expect(ids.has(`showcase-driver-${key}`)).toBe(true);
  for (let i = 0; i < 8; i++) {
    expect(ids.has(`faq-item-${i}`)).toBe(true);
    expect(ids.has(`faq-answer-${i}`)).toBe(true);
  }
  expect(
    [...container.querySelectorAll("main > section")].map((e) => e.id),
  ).toEqual([
    "hero",
    "probleme",
    "solution",
    "comment-ca-marche",
    "produit",
    "fonctionnalites",
    "temoignage",
    "tarifs",
    "faq",
    "cta-final",
  ]);
  expect(container.textContent).not.toContain("30 commandes");
});
