export function readTestBillingPrices(values: {pro?:string;business?:string}): {pro:number;business:number}|null {
  const pro=values.pro?.trim(), business=values.business?.trim()
  if(!pro&&!business)return null
  const amounts=[Number(pro),Number(business)]
  if(!pro||!business||amounts.some(amount=>!Number.isSafeInteger(amount)||amount<100||amount>5000000))
    throw new Error('Configurez les deux prix de test avec des entiers entre 100 et 5 000 000 FCFA.')
  return {pro:amounts[0],business:amounts[1]}
}
// Explicit access lets Next.js embed the same public prices in the UI and server build.
export const TEST_BILLING_PRICES=readTestBillingPrices({
  pro:process.env.NEXT_PUBLIC_TEST_PRO_PRICE,
  business:process.env.NEXT_PUBLIC_TEST_BUSINESS_PRICE,
})
