import { getAllUsers } from '@/services/platform-service'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge className={role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'}>
      {role === 'admin' ? 'Admin' : 'Employé'}
    </Badge>
  )
}

export default async function AdminUsersPage() {
  const users = await getAllUsers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Utilisateurs</h1>
        <p className="text-gray-500 text-sm mt-1">{users.length} utilisateur(s), toutes organisations confondues.</p>
      </div>

      <Card className="overflow-hidden">
        {/* Mobile: cards */}
        <ul className="divide-y divide-gray-100 sm:hidden">
          {users.map((u) => (
            <li key={u.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{u.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email ?? '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{u.phone ?? '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <RoleBadge role={u.role} />
                  {u.is_owner && <Badge className="bg-amber-100 text-amber-800">Propriétaire</Badge>}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span className="truncate">{u.organization_name ?? '—'}</span>
                <span>{formatDate(u.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left bg-gray-50">
                <th className="px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 font-medium text-gray-600">Téléphone</th>
                <th className="px-4 py-3 font-medium text-gray-600">Rôle</th>
                <th className="px-4 py-3 font-medium text-gray-600">Organisation</th>
                <th className="px-4 py-3 font-medium text-gray-600">Depuis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{u.full_name}</span>
                      {u.is_owner && <Badge className="bg-amber-100 text-amber-800">Propriétaire</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone ?? '—'}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-gray-700">{u.organization_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
