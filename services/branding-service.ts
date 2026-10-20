import { createAdminClient } from '@/services/supabase/server'
import { LOGO_BUCKET } from '@/lib/branding'

export async function getOrganizationBranding(organizationId: string) {
  const db = await createAdminClient()
  const { data, error } = await db.from('organizations').select('name,logo_path').eq('id', organizationId).single()
  if (error || !data) throw new Error('Impossible de charger la boutique.')
  const logoPath: string | null = data.logo_path?.startsWith(`${organizationId}/`) ? data.logo_path : null
  return { name: data.name as string, logoPath,
    logoUrl: logoPath ? db.storage.from(LOGO_BUCKET).getPublicUrl(logoPath).data.publicUrl : null }
}
export async function saveOrganizationLogo(organizationId: string, bytes: Buffer | null) {
  const db = await createAdminClient()
  const previous = await getOrganizationBranding(organizationId)
  const path = bytes ? `${organizationId}/${crypto.randomUUID()}.png` : null
  if (path && bytes) {
    const { error } = await db.storage.from(LOGO_BUCKET).upload(path, bytes, { contentType: 'image/png', upsert: false })
    if (error) throw new Error('Import du logo impossible.')
  }
  const { error } = await db.from('organizations').update({ logo_path: path }).eq('id', organizationId).select('id').single()
  if (error) {
    if (path) await db.storage.from(LOGO_BUCKET).remove([path])
    throw new Error('Enregistrement du logo impossible.')
  }
  if (previous.logoPath) await db.storage.from(LOGO_BUCKET).remove([previous.logoPath])
  return getOrganizationBranding(organizationId)
}
export async function getOrganizationLogoBytes(organizationId: string, path: string | null) {
  if (!path || !path.startsWith(`${organizationId}/`)) return null
  const db = await createAdminClient()
  const { data, error } = await db.storage.from(LOGO_BUCKET).download(path)
  if (error || !data) return null // A missing logo must not prevent printing.
  return Buffer.from(await data.arrayBuffer())
}
