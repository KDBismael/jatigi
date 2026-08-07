// Organizations excluded from the platform (super-admin) views — e.g. test/demo
// accounts. Exclusion is keyed on EMAIL (unique, unlike org names): list the
// email of any member of the org to hide (typically the owner). That member's
// whole organization — its users, orders, revenue and delivery money — is removed
// from EVERY platform total, the users list, and the organizations list.
//
// Example:
//   export const EXCLUDED_EMAILS = ['moi@bonplan.com', 'demo@warko.app']
export const EXCLUDED_EMAILS: string[] = [
'ismaelkondombo1@gmail.com'
]

const excludedSet = new Set(EXCLUDED_EMAILS.map((e) => e.trim().toLowerCase()))

export function isExcludedEmail(email?: string | null): boolean {
  if (!email) return false
  return excludedSet.has(email.trim().toLowerCase())
}
