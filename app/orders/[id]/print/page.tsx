import { notFound, redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/services/supabase/server'
import { getOrderById } from '@/services/order-service'
import { orderAmounts } from '@/lib/order-amounts'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PrintButton } from '@/components/orders/print-button'

export default async function PrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await auth.from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) notFound()
  const { id } = await params
  const order = await getOrderById(id, profile.organization_id)
  if (!order) notFound()
  const admin = await createAdminClient()
  const { data: organization } = await admin.from('organizations').select('name').eq('id', profile.organization_id).single()
  const lines = order.order_lines ?? []
  const amounts = orderAmounts(lines, order.delivery_fee, order.confirmation_amount)
  return <main className="print-page min-h-screen bg-gray-100 px-4 py-8 text-gray-950">
    <div className="print-actions mx-auto mb-4 flex max-w-[210mm] justify-end"><PrintButton /></div>
    <article className="print-sheet mx-auto min-h-[297mm] max-w-[210mm] bg-white p-8 sm:p-12 shadow-xl">
      <header className="flex justify-between gap-6 border-b-2 border-gray-900 pb-6">
        <div><p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-600">Warko</p><h1 className="mt-2 text-3xl font-bold">Bon de commande</h1><p className="mt-1 text-gray-500">{organization?.name ?? 'Boutique'}</p></div>
        <div className="text-right text-sm"><p className="font-semibold">N° {order.id.slice(0,8).toUpperCase()}</p><p className="text-gray-500">{formatDate(order.order_date)}</p></div>
      </header>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-gray-200">
        <div><h2 className="text-xs font-bold uppercase text-gray-500">Client</h2><p className="mt-2 text-lg font-semibold">{order.client_name}</p><p>{order.client_phone || 'Contact non renseigné'}</p></div>
        <div><h2 className="text-xs font-bold uppercase text-gray-500">Livraison</h2><p className="mt-2">{order.delivery_location || 'Adresse non renseignée'}</p>{order.delivery_driver&&<p className="text-sm text-gray-500">Livreur : {order.delivery_driver.name}</p>}</div>
      </section>
      <table className="mt-8 w-full text-sm"><thead><tr className="border-b-2 border-gray-900 text-left"><th className="py-3">Produit</th><th className="py-3 text-center">Qté</th><th className="py-3 text-right">Prix</th><th className="py-3 text-right">Total</th></tr></thead><tbody>{lines.map(line=><tr key={line.id} className="border-b border-gray-200"><td className="py-4">{line.product?.name ?? 'Produit'}</td><td className="py-4 text-center">{line.quantity}</td><td className="py-4 text-right">{formatCurrency(line.unit_price)}</td><td className="py-4 text-right font-medium">{formatCurrency(line.unit_price*line.quantity)}</td></tr>)}</tbody></table>
      <section className="ml-auto mt-8 max-w-sm space-y-2 text-sm"><Amount label="Coût du colis" value={amounts.parcelAmount}/><Amount label="Coût de livraison" value={amounts.deliveryFee}/><Amount label="Montant total" value={amounts.totalAmount} strong/><Amount label="Acompte payé" value={amounts.confirmationAmount}/><Amount label="Reste à payer" value={amounts.remainingAmount} strong/></section>
      <footer className="mt-16 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">Document généré par Warko</footer>
    </article>
  </main>
}
function Amount({label,value,strong=false}:{label:string;value:number;strong?:boolean}) { return <div className={`flex justify-between gap-8 ${strong?'border-t border-gray-900 pt-2 text-base font-bold':''}`}><span>{label}</span><span>{formatCurrency(value)}</span></div> }
