// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Brand } from "@/components/layout/brand";
afterEach(cleanup);
it.each(["sm", "md", "lg"] as const)(
  "keeps %s buttons at least 44px and forwards disabled",
  (size) => {
    render(
      <Button size={size} disabled>
        Enregistrer
      </Button>,
    );
    const b = screen.getByRole("button");
    expect(b.className).toContain("min-h-11");
    expect((b as HTMLButtonElement).disabled).toBe(true);
  },
);
it("uses consistent decorative stroke icons and a real brand image", () => {
  const { container } = render(
    <>
      <Icon name="chevron-left" />
      <Icon name="credit-card" />
      <Brand />
    </>,
  );
  for (const svg of container.querySelectorAll("svg")) {
    expect(svg.getAttribute("stroke-width")).toBe("1.8");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  }
  expect(container.querySelector("img")?.getAttribute("src")).toBe("/icon.svg");
  expect(screen.getByText("Warko")).toBeTruthy();
});
