import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { prepareLogo } from '@/lib/branding'

describe('logos de boutique', () => {
  it('vérifie et normalise un PNG réel', async () => {
    const bytes = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#000' } }).png().toBuffer()
    const result = await prepareLogo(new File([bytes], 'logo.png', { type: 'image/png' }))
    expect((await sharp(result).metadata()).format).toBe('png')
  })
  it('refuse les gros fichiers et les faux fichiers image', async () => {
    await expect(prepareLogo(new File([new Uint8Array(2097153)], 'logo.png', { type: 'image/png' }))).rejects.toThrow('2 Mo')
    await expect(prepareLogo(new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' }))).rejects.toThrow('PNG ou JPEG')
    await expect(prepareLogo(new File(['not an image'], 'logo.png', { type: 'image/png' }))).rejects.toThrow('Image invalide')
  })
})
