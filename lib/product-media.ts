import sharp from 'sharp'
export async function validateProductImage(bytes: Buffer,mime: string) {
 if(bytes.length>2*1024*1024)throw new Error('Image limitée à 2 Mo')
 if(!['image/png','image/jpeg'].includes(mime))throw new Error('Utilisez une image PNG ou JPEG')
 const metadata=await sharp(bytes,{limitInputPixels:25_000_000}).metadata()
 if(!['png','jpeg'].includes(metadata.format??'')||`image/${metadata.format}`!==mime)throw new Error('Image PNG ou JPEG invalide')
 const image=sharp(bytes,{limitInputPixels:25_000_000}).rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true})
 return {bytes:await (mime==='image/png'?image.png():image.jpeg({quality:85})).toBuffer(),mime,extension:mime==='image/png'?'png':'jpg'}
}
