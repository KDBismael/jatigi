"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { navigationFor, isNavigationActive } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanNavBadge } from "@/components/billing/plan-nav-badge";
import { Brand } from "./brand";
export function Sidebar() {
  const pathname = usePathname(),
    { profile, organization } = useAuthStore();
  const items = navigationFor(profile?.role ?? null);
  return (
    <aside
      aria-label="Navigation latérale"
      className="app-navigation hidden w-64 shrink-0 flex-col bg-gray-900 text-white md:flex"
    >
      <div className="border-b border-gray-700 px-6 py-5">
        <Brand className="mb-2 text-white" />
        {organization ? (
          <p title={organization.name} className="truncate text-sm font-bold">
            {organization.name}
          </p>
        ) : (
          <Skeleton className="h-4 w-32 bg-gray-700" />
        )}
      </div>
      <nav
        aria-label="Navigation principale"
        className="flex-1 space-y-1 px-3 py-4"
      >
        {!profile ? (
          <div role="status">
            <span className="sr-only">Chargement de la navigation</span>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="my-3 h-8 w-full bg-gray-700" />
            ))}
          </div>
        ) : (
          items
            .filter((item) => item.href !== "/account")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  isNavigationActive(pathname, item.href) ? "page" : undefined
                }
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                  isNavigationActive(pathname, item.href)
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white",
                )}
              >
                <Icon name={item.icon} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/subscription" && <PlanNavBadge />}
              </Link>
            ))
        )}
      </nav>
      <div className="space-y-2 border-t border-gray-700 px-4 py-4">
        {profile ? (
          <>
            <div className="px-1">
              <p className="truncate text-sm font-medium">
                {profile.full_name}
              </p>
              <p className="text-xs text-gray-400">
                {ROLE_LABELS[profile.role]}
              </p>
            </div>
            <Link
              href="/account"
              aria-current={
                isNavigationActive(pathname, "/account") ? "page" : undefined
              }
              className="flex min-h-11 items-center gap-3 px-1 text-sm text-gray-300 hover:text-white"
            >
              <Icon name="user" />
              Mon compte
            </Link>
            <Link
              href="/more"
              aria-current={
                isNavigationActive(pathname, "/more") ? "page" : undefined
              }
              className="flex min-h-11 items-center gap-3 px-1 text-sm text-gray-300 hover:text-white"
            >
              <Icon name="menu" />
              Plus et apparence
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-3 px-1 text-left text-sm text-gray-400 hover:text-white"
              >
                <Icon name="logout" />
                Déconnexion
              </button>
            </form>
          </>
        ) : (
          <Skeleton className="h-16 w-full bg-gray-700" />
        )}
      </div>
    </aside>
  );
}
