function price(value:string|undefined,fallback:number):number {
  if(!value?.trim())return fallback
  const parsed=Number(value.trim())
  if(!Number.isSafeInteger(parsed)||parsed<100||parsed>5000000)throw new Error('Les prix des abonnements doivent être des entiers entre 100 et 5 000 000 FCFA.')
  return parsed
}
// Explicit references are compiled identically into the browser and server bundles.
export const CONFIGURED_BILLING_PRICES={
 pro:{monthly:price(process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE,5000),yearly:price(process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE,48000)},
 business:{monthly:price(process.env.NEXT_PUBLIC_BUSINESS_MONTHLY_PRICE,10000),yearly:price(process.env.NEXT_PUBLIC_BUSINESS_YEARLY_PRICE,96000)},
}
export const HAS_CUSTOM_BILLING_PRICES=!!(
 process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE?.trim()||process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE?.trim()||
 process.env.NEXT_PUBLIC_BUSINESS_MONTHLY_PRICE?.trim()||process.env.NEXT_PUBLIC_BUSINESS_YEARLY_PRICE?.trim()
)
export function annualDiscount(monthly:number,yearly:number):number {
 return monthly>0?Math.max(0,Math.floor((monthly*12-yearly)*100/(monthly*12))):0
}
