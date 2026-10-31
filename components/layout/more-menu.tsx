"use client";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { navigationFor } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/constants";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanNavBadge } from "@/components/billing/plan-nav-badge";
import { ThemeSwitcher } from "./theme-switcher";
export function MoreMenu() {
  const profile = useAuthStore((s) => s.profile);
  const items = navigationFor(profile?.role ?? null);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Plus</h1>
      {!profile ? (
        <div role="status">
          <span className="sr-only">Chargement du menu</span>
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          {(["Pilotage", "Boutique", "Aide"] as const).map((group) => {
            const links = items.filter((i) => i.group === group);
            return links.length ? (
              <section key={group} aria-label={group}>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group}
                </h2>
                <Card className="more-menu-group divide-y divide-gray-100 overflow-hidden">
                  {links.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex min-h-[54px] items-center gap-3 px-4 py-3 text-[15px] text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                    >
                      <Icon name={item.icon} className="text-gray-600" />
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/subscription" && <PlanNavBadge />}
                      <Icon
                        name="chevron-right"
                        className="h-4 w-4 text-gray-400"
                      />
                    </Link>
                  ))}
                </Card>
              </section>
            ) : null;
          })}
          <section aria-label="Affichage">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Affichage
            </h2>
            <ThemeSwitcher />
          </section>
          <form action="/api/auth/signout" method="POST">
            <Button
              type="submit"
              variant="secondary"
              className="more-signout min-h-12 w-full gap-2 border-red-200 text-red-700"
            >
              <Icon name="logout" />
              Déconnexion
            </Button>
          </form>
          <p className="text-center text-xs text-gray-500">
            {profile.full_name} · {ROLE_LABELS[profile.role]}
          </p>
        </>
      )}
    </div>
  );
}
