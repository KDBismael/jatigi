"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import {
  bottomNavigationFor,
  isBottomNavigationActive,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
export function AppBottomNav() {
  const role = useAuthStore((s) => s.profile?.role ?? null),
    pathname = usePathname();
  const items = bottomNavigationFor(role);
  return (
    <nav
      aria-label="Navigation principale"
      className="app-navigation fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {!role ? (
        <div
          role="status"
          className="flex h-[72px] items-center justify-around"
        >
          <span className="sr-only">Chargement de la navigation</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-12" />
          ))}
        </div>
      ) : (
        <div className="flex h-[72px]">
          {items.map((item) => {
            const active = isBottomNavigationActive(pathname, item, role);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500",
                  active
                    ? "font-bold text-indigo-600"
                    : "font-medium text-gray-500",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0 h-[3px] w-7 rounded-b",
                    active ? "bg-indigo-600" : "bg-transparent",
                  )}
                />
                <Icon name={item.icon} className="h-6 w-6" />
                <span>{item.short}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
