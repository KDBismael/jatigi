import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/services/supabase/server', () => ({ createAdminClient: vi.fn() }))
import { createAdminClient } from '@/services/supabase/server'
import { getOrganizationBranding, getOrganizationLogoBytes, saveOrganizationLogo } from '@/services/branding-service'

beforeEach(() => vi.resetAllMocks())
function database(options: { oldPath?: string | null; updateError?: boolean; uploadError?: boolean } = {}) {
  let currentPath = options.oldPath ?? null
  const storage = { upload: vi.fn().mockResolvedValue({ error: options.uploadError ? { message: 'upload failed' } : null }), remove: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://example.test/${path}` } })), download: vi.fn() }
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    update: vi.fn((value: { logo_path: string | null }) => { if (!options.updateError) currentPath = value.logo_path; return query }),
    single: vi.fn(async () => ({ data: { id: 'own-org', name: 'Boutique', logo_path: currentPath }, error: options.updateError ? { message: 'update failed' } : null })),
  }
  // Only the UPDATE must fail, not the preliminary SELECT.
  if (options.updateError) query.single.mockResolvedValueOnce({ data: { id: 'own-org', name: 'Boutique', logo_path: currentPath }, error: null })
  vi.mocked(createAdminClient).mockResolvedValue({ from: vi.fn().mockReturnValue(query), storage: { from: vi.fn().mockReturnValue(storage) } } as unknown as Awaited<ReturnType<typeof createAdminClient>>)
  return { query, storage }
}
describe('stockage des logos', () => {
  it('isole les fichiers par boutique et nettoie l’ancien logo après remplacement', async () => {
    const { storage, query } = database({ oldPath: 'own-org/previous.png' })
    const result = await saveOrganizationLogo('own-org', Buffer.from('png'))
    expect(result.logoPath).toMatch(/^own-org\/.+\.png$/)
    expect(query.eq).toHaveBeenCalledWith('id', 'own-org')
    expect(storage.remove).toHaveBeenCalledWith(['own-org/previous.png'])
  })
  it('supprime l’import si l’écriture en base échoue', async () => {
    const { storage } = database({ oldPath: 'own-org/previous.png', updateError: true })
    await expect(saveOrganizationLogo('own-org', Buffer.from('png'))).rejects.toThrow('Enregistrement')
    expect(storage.remove).toHaveBeenCalledWith([expect.stringMatching(/^own-org\/.+\.png$/)])
    expect(storage.remove).not.toHaveBeenCalledWith(['own-org/previous.png'])
  })
  it('ne charge pas le logo d’une autre boutique', async () => {
    const { storage } = database({ oldPath: 'other-org/logo.png' })
    expect((await getOrganizationBranding('own-org')).logoUrl).toBeNull()
    expect(await getOrganizationLogoBytes('own-org', 'other-org/logo.png')).toBeNull()
    expect(storage.download).not.toHaveBeenCalled()
  })
})
