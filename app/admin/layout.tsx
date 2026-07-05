import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { AdminShell } from '@/components/admin/admin-shell'

export const metadata = {
  title: 'Warko — Administration',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin()
  if (!admin) redirect('/auth/login')

  return <AdminShell>{children}</AdminShell>
}
