import {expect,it} from 'vitest'
import sharp from 'sharp'
import { validateProductImage } from '@/lib/product-media'
it('accepts real PNG and rejects disguised files or files above 2 MB',async()=>{
 const png=await sharp({create:{width:2,height:2,channels:3,background:'red'}}).png().toBuffer()
 expect((await validateProductImage(png,'image/png')).mime).toBe('image/png')
 await expect(validateProductImage(Buffer.from('not an image'),'image/png')).rejects.toThrow()
 await expect(validateProductImage(Buffer.alloc(2*1024*1024+1),'image/png')).rejects.toThrow('2 Mo')
 await expect(validateProductImage(png,'image/svg+xml')).rejects.toThrow('PNG ou JPEG')
})
