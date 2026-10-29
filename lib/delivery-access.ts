export function canManageDeliveries(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'manager'
}
