"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Brand } from "@/components/layout/brand";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Vue d’ensemble", icon: "dashboard" },
  { href: "/admin/users", label: "Utilisateurs", icon: "users" },
  { href: "/admin/organizations", label: "Organisations", icon: "building" },
  { href: "/admin/analytics", label: "Analytique", icon: "chart" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col shrink-0">
        <div className="px-6 py-5 border-b border-gray-800">
          <Brand />
          <h1 className="text-sm font-bold text-white mt-1">Administration</h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive(item.href)
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white",
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-800">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="min-h-11 w-full text-left text-sm text-gray-400 hover:text-white py-1 transition-colors"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar + nav */}
        <div className="md:hidden bg-gray-900 text-white">
          <div className="flex items-center justify-between px-4 py-3">
            <Brand />
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="min-h-11 text-sm text-gray-300">
                Déconnexion
              </button>
            </form>
          </div>
          <nav className="flex overflow-x-auto px-2 pb-2 gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap",
                  isActive(item.href)
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300",
                )}
              >
                <Icon name={item.icon} className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
