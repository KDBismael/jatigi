'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useRole } from '@/hooks/use-role'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', adminOnly: true, icon: '📊' },
  { href: '/orders', label: 'Commandes', adminOnly: false, icon: '📦' },
  { href: '/deliveries', label: 'Livraisons', adminOnly: true, icon: '🛵' },
  { href: '/products', label: 'Produits', adminOnly: true, icon: '🛍️' },
  { href: '/analytics', label: 'Analyses', adminOnly: true, icon: '📈' },
  { href: '/team', label: 'Équipe', adminOnly: true, icon: '👥' },
]

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
            <span>{item.icon}</span>
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
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
        <span className="text-sm font-bold text-white tracking-widest uppercase">Warko</span>
        <button
          onClick={() => setOpen(true)}
          className="text-gray-300 hover:text-white p-1"
          aria-label="Ouvrir le menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-72 bg-gray-900 text-white flex flex-col h-full shadow-xl">
            <div className="flex items-center justify-end px-4 py-3 border-b border-gray-700">
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col min-h-screen shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
