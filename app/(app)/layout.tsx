import { AuthProvider } from '@/components/layout/auth-provider'
import { Sidebar } from '@/components/layout/sidebar'
import { ThemeProvider } from '@/components/layout/theme-provider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <script dangerouslySetInnerHTML={{__html:`(()=>{try{const p=localStorage.getItem('warko-theme');const d=p==='dark'||((!p||p==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.warkoTheme=d?'dark':'light'}catch{}})()`}} />
      <ThemeProvider><div className="app-shell flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          {/* Spacer for mobile top bar */}
          <div className="mobile-top-spacer md:hidden h-14" />
          {/* pb on mobile leaves room for the fixed bottom tab bar */}
          <div className="max-w-7xl mx-auto p-4 pb-24 md:p-8 md:pb-8">{children}</div>
        </main>
      </div></ThemeProvider>
    </AuthProvider>
  )
}
