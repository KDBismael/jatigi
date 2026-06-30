'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useRole } from '@/hooks/use-role'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', short: 'Tableau', adminOnly: true, icon: 'dashboard' },
  { href: '/orders', label: 'Commandes', short: 'Commandes', adminOnly: false, icon: 'cart' },
  { href: '/deliveries', label: 'Livraisons', short: 'Livraisons', adminOnly: true, icon: 'truck' },
  { href: '/products', label: 'Produits', short: 'Produits', adminOnly: true, icon: 'box' },
  { href: '/analytics', label: 'Analyses', short: 'Analyses', adminOnly: true, icon: 'chart' },
  { href: '/team', label: 'Équipe', short: 'Équipe', adminOnly: true, icon: 'users' },
] as const

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />,
  cart: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />,
  truck: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />,
  box: <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />,
  chart: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />,
  users: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />,
}

function NavIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className ?? 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      {ICONS[name]}
    </svg>
  )
}

function getInitials(fullName?: string): string {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { isAdmin } = useRole()
  const { profile, organization } = useAuthStore()

  const profileLoaded = profile !== null
  const visibleItems = profileLoaded
    ? NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
    : NAV_ITEMS

  return (
    <div className="flex flex-col h-full">
      {/* Brand + org name */}
      <div className="px-6 py-5 border-b border-gray-700">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">Warko</p>
        {organization?.name ? (
          <h1 className="text-sm font-bold text-white truncate">{organization.name}</h1>
        ) : (
          <div className="h-4 w-32 bg-gray-700 rounded animate-pulse mt-1" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-700 space-y-3">
        <div className="px-1">
          {profile?.full_name ? (
            <>
              <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
              <p className="text-xs text-gray-400">
                {profile.role === 'admin' ? 'Administrateur' : 'Employé'}
              </p>
            </>
          ) : (
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5 px-1">
          <Link
            href="/account"
            onClick={onClose}
            className={cn(
              'text-sm py-1 transition-colors',
              pathname.startsWith('/account') ? 'text-white' : 'text-gray-400 hover:text-white'
            )}
          >
            Mon compte
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full text-left text-sm text-gray-400 hover:text-white py-1 transition-colors"
            >
              Déconnexion →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { isAdmin } = useRole()
  const { profile } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const profileLoaded = profile !== null
  const bottomItems = profileLoaded
    ? NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
    : NAV_ITEMS

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <span className="text-base font-bold text-indigo-600 tracking-tight">Warko</span>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center"
            aria-label="Menu du compte"
          >
            {getInitials(profile?.full_name)}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-500">
                    {profile?.role === 'admin' ? 'Administrateur' : 'Employé'}
                  </p>
                </div>
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Mon compte
                </Link>
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Déconnexion
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {bottomItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 basis-0 min-w-[64px] flex flex-col items-center gap-1 py-2.5 transition-colors',
                  active ? 'text-indigo-600' : 'text-gray-500'
                )}
              >
                <NavIcon name={item.icon} className="w-6 h-6" />
                <span className="text-[11px] font-medium whitespace-nowrap">{item.short}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col min-h-screen shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
