import { AuthProvider } from '@/components/layout/auth-provider'
import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          {/* Spacer for mobile top bar */}
          <div className="md:hidden h-14" />
          {/* pb on mobile leaves room for the fixed bottom tab bar */}
          <div className="max-w-7xl mx-auto p-4 pb-24 md:p-8 md:pb-8">{children}</div>
        </main>
      </div>
    </AuthProvider>
  )
}
