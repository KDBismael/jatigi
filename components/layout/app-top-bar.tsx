"use client";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
export function AppTopBar() {
  const { profile, organization } = useAuthStore();
  const initials =
    profile?.full_name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .filter((_, i, a) => i === 0 || i === a.length - 1)
      .join("")
      .toUpperCase() || "?";
  return (
    <header className="app-navigation fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white px-4 pt-[env(safe-area-inset-top)] md:hidden">
      <div className="flex h-16 min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/icon.svg"
            width={24}
            height={24}
            alt=""
            className="shrink-0"
          />
          <div className="min-w-0 leading-tight">
            <p className="text-[15px] font-bold text-gray-900">Warko</p>
            {organization ? (
              <p
                title={organization.name}
                className="truncate text-xs text-gray-500"
              >
                {organization.name}
              </p>
            ) : (
              <Skeleton className="mt-1 h-3 w-28" />
            )}
          </div>
        </div>
        {profile ? (
          <Link
            href="/account"
            aria-label="Mon compte"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {initials}
          </Link>
        ) : (
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
        )}
      </div>
    </header>
  );
}
