import {PDFDocument,rgb} from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {PLANS} from '@/lib/billing/plans'
import type {BillingReceipt} from './billing-service'
export async function generateBillingReceiptPdf(receipt:BillingReceipt) {
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit)
 const font=await pdf.embedFont(await readFile(path.join(process.cwd(),'assets/fonts/NotoSans-Regular.ttf')),{subset:true})
 const page=pdf.addPage([595.28,841.89]);page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:rgb(1,1,1)});let y=780
 const date=(v:string)=>new Date(v).toLocaleDateString('fr-FR',{timeZone:'Africa/Abidjan'})
 const lines=[receipt.mode==='test'?'WARKO — REÇU DE TEST':'WARKO — REÇU DE PAIEMENT',`Référence : ${receipt.id}`,`Boutique : ${receipt.shop}`,`Offre : ${PLANS[receipt.plan].name} — ${receipt.cycle==='yearly'?'annuel':'mensuel'}`,`Montant payé : ${receipt.amount.toLocaleString('fr-FR')} FCFA`,`Date de paiement : ${date(receipt.paidAt)}`,`Période : ${date(receipt.periodStart)} au ${date(receipt.periodEnd)}`,'Renouvellement : nouveau paiement à chaque échéance.']
 for(const [i,text] of lines.entries()) {
  let line='';const size=i===0?18:11
  for(const char of text.replace(/[\u0000-\u001f]/g,' ')) {
   if(font.widthOfTextAtSize(line+char,size)>490){page.drawText(line,{x:50,y,size,font,color:rgb(0,0,0)});y-=20;line=''}
   line+=char
  }
  page.drawText(line,{x:50,y,size,font,color:rgb(0,0,0)});y-=i===0?46:32
 }
 return pdf.save()
}
