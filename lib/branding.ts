import sharp from 'sharp'
export const LOGO_BUCKET = 'organization-logos'
export async function prepareLogo(file: File): Promise<Buffer> {
  if (file.size > 2097152) throw new Error('Le logo doit faire au maximum 2 Mo.')
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choisissez un logo PNG ou JPEG.')
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 16000000 })
    const metadata = await image.metadata()
    if (!['png', 'jpeg'].includes(metadata.format ?? '')) throw new Error('Unsupported image')
    return await image.rotate().resize(600, 600, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()
  } catch { throw new Error('Image invalide ou trop grande. Choisissez un PNG ou JPEG valide.') }
}
