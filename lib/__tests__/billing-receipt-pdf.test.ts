import {it,expect} from 'vitest'
import {PDFDocument} from 'pdf-lib'
import {writeFile} from 'node:fs/promises'
import {generateBillingReceiptPdf} from '@/services/billing-receipt-pdf'
it('generates a readable A4 receipt with Unicode names and a test marker',async()=>{
 const bytes=await generateBillingReceiptPdf({id:'10000000-0000-4000-8000-000000000001',shop:'Boutique Élégance — Côte d’Ivoire',plan:'pro',cycle:'monthly',amount:5000,mode:'test',paidAt:'2026-10-29T00:00:00Z',periodStart:'2026-10-29T00:00:00Z',periodEnd:'2026-11-29T00:00:00Z'})
 const pdf=await PDFDocument.load(bytes)
 expect(pdf.getPageCount()).toBe(1);expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.28);expect(bytes.byteLength).toBeGreaterThan(1000)
 if(process.env.WARKO_QA_RENDER)await writeFile('/private/tmp/warko-receipt.pdf',bytes)
})
