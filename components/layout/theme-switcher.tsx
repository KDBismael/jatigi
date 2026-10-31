"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "./theme-provider";
export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <Card className="grid grid-cols-3 gap-1 p-1">
      <div role="group" aria-label="Thème" className="contents">
        {(["system", "light", "dark"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            variant={preference === value ? "primary" : "ghost"}
            className={
              preference === value
                ? "theme-choice bg-gray-900 hover:bg-gray-800"
                : "theme-choice"
            }
            aria-pressed={preference === value}
            onClick={() => setPreference(value)}
          >
            {{ system: "Système", light: "Clair", dark: "Sombre" }[value]}
          </Button>
        ))}
      </div>
    </Card>
  );
}
