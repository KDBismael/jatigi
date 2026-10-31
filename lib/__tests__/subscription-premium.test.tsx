// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SubscriptionView } from '@/components/billing/subscription-view'
import type { SubscriptionSummary } from '@/lib/billing/plans'
afterEach(cleanup)
const base: SubscriptionSummary = { plan: 'pro', cycle: 'monthly', status: 'active', periodEnd: '2026-11-15T00:00:00Z', cancelAtPeriodEnd: false, pendingPlan: null, usage: { orders: 95, drivers: 2, users: 2 }, limits: { orders: null, drivers: 5, users: 3 }, canManageBilling: true, payments: [] }
const props = { onCheckout: vi.fn(), onAction: vi.fn(), onReconcile: vi.fn(), busy: false }
it('shows paid membership, real dates, renewal and lower plans without checkout', () => {
 render(<SubscriptionView summary={base} {...props} />)
 expect(screen.getByTestId('subscription-current-plan').getAttribute('data-paid')).toBe('true')
 expect(screen.getByText('15/11/2026')).toBeTruthy()
 expect(within(screen.getByTestId('subscription-plan-discovery')).queryByRole('button')).toBeNull()
 fireEvent.click(screen.getByTestId('subscription-choose-pro'))
 expect(props.onCheckout).toHaveBeenCalledWith('pro', 'monthly')
 expect(screen.queryByTestId('subscription-receipt-latest')).toBeNull()
})
it('keeps discovery neutral with only its main Pro upgrade in gold', () => {
 render(<SubscriptionView summary={{...base, plan:'discovery', status:'free'}} {...props} />)
 expect(screen.getByTestId('subscription-current-plan').getAttribute('data-paid')).toBe('false')
 expect(screen.getByTestId('subscription-upgrade-pro').getAttribute('data-tone')).toBe('gold')
 expect(screen.getByTestId('subscription-choose-pro').getAttribute('data-tone')).toBe('neutral')
})
it('warns at the supplied order limit minus five and renders unlimited usage', () => {
 const {rerender} = render(<SubscriptionView summary={{...base, limits:{...base.limits, orders:200}, usage:{...base.usage,orders:194}}} {...props} />)
 expect(screen.queryByText(/Plus que 5 commandes/)).toBeNull()
 rerender(<SubscriptionView summary={{...base, limits:{...base.limits,orders:200}, usage:{...base.usage,orders:195}}} {...props} />)
 expect(screen.getByText(/Plus que 5 commandes/)).toBeTruthy()
 rerender(<SubscriptionView summary={base} {...props} />)
 expect(within(screen.getByTestId('subscription-usage-orders')).getByText(/Illimité/)).toBeTruthy()
})
it('hides every billing action, alert and payment from non owners', () => {
 render(<SubscriptionView summary={{...base, status:'grace', cancelAtPeriodEnd:true,canManageBilling:false}} {...props} />)
 expect(screen.queryByTestId('subscription-grace-alert')).toBeNull()
 expect(screen.queryByTestId('subscription-manage')).toBeNull()
 expect(screen.queryByTestId('subscription-payments')).toBeNull()
 expect(screen.queryByTestId('subscription-upgrade-business')).toBeNull()
 expect(screen.queryByTestId('subscription-choose-pro')).toBeNull()
 expect(screen.getByText(/Seul le propriétaire/)).toBeTruthy()
})
it('preserves grace, resume, annual and expired state actions', () => {
 const {rerender} = render(<SubscriptionView summary={{...base,status:'grace'}} {...props} />)
 fireEvent.click(screen.getByTestId('subscription-grace-pay'))
 expect(props.onCheckout).toHaveBeenCalledWith('pro','monthly')
 rerender(<SubscriptionView summary={{...base,cancelAtPeriodEnd:true}} {...props} />)
 fireEvent.click(screen.getByTestId('subscription-resume'))
 expect(props.onAction).toHaveBeenCalledWith('resume')
 fireEvent.click(screen.getByTestId('subscription-cycle-yearly'))
 fireEvent.click(screen.getByTestId('subscription-choose-pro'))
 expect(props.onCheckout).toHaveBeenCalledWith('pro','yearly')
 expect(screen.getByText(/Économisez 12/)).toBeTruthy()
 rerender(<SubscriptionView summary={{...base,status:'expired'}} {...props} />)
 expect(screen.getByText('Expiré')).toBeTruthy()
})
it('links the latest paid receipt and reconciles pending payment using its invoice id', () => {
 render(<SubscriptionView summary={{...base,payments:[{id:'pending',plan:'pro',cycle:'monthly',amount:5000,state:'pending',createdAt:'2026-10-30',paidAt:null,receiptUrl:'/pending'}, {id:'paid',plan:'pro',cycle:'monthly',amount:5000,state:'paid',createdAt:'2026-10-01',paidAt:'2026-10-01',receiptUrl:'/api/billing/receipts/paid'}]}} {...props} />)
 expect(screen.getByTestId('subscription-receipt-latest').getAttribute('href')).toBe('/api/billing/receipts/paid')
 fireEvent.click(screen.getByTestId('subscription-reconcile'))
 expect(props.onReconcile).toHaveBeenCalledWith('pending')
 expect(screen.getAllByTestId('subscription-payment-row')).toHaveLength(2)
})
it('keeps historical receipts neutral after returning to Discovery', () => {
 render(<SubscriptionView summary={{...base,plan:'discovery',status:'free',payments:[{id:'old',plan:'pro',cycle:'monthly',amount:5000,state:'paid',createdAt:'2026-10-01',paidAt:'2026-10-01',receiptUrl:'/api/billing/receipts/old'}]}} {...props} />)
 expect(screen.queryByTestId('subscription-receipt-latest')).toBeNull()
 expect(screen.getByTestId('subscription-receipt').getAttribute('data-paid')).toBe('false')
})
it('keeps actual expired and free status when cancellation remains persisted', () => {
 const {rerender}=render(<SubscriptionView summary={{...base,plan:'discovery',status:'expired',cancelAtPeriodEnd:true}} {...props} />)
 expect(within(screen.getByTestId('subscription-current-plan')).getByText('Expiré')).toBeTruthy()
 expect(screen.queryByTestId('subscription-cancel-notice')).toBeNull()
 rerender(<SubscriptionView summary={{...base,plan:'discovery',status:'free',cancelAtPeriodEnd:true}} {...props} />)
 expect(within(screen.getByTestId('subscription-current-plan')).getByText('Gratuit')).toBeTruthy()
 expect(screen.queryByTestId('subscription-cancel-notice')).toBeNull()
 rerender(<SubscriptionView summary={{...base,status:'grace',cancelAtPeriodEnd:true}} {...props} />)
 expect(within(screen.getByTestId('subscription-current-plan')).getByText('Délai de grâce')).toBeTruthy()
 expect(screen.queryByTestId('subscription-cancel-notice')).toBeNull()
 rerender(<SubscriptionView summary={{...base,status:'expired',cancelAtPeriodEnd:true}} {...props} />)
 expect(within(screen.getByTestId('subscription-current-plan')).getByText('Expiré')).toBeTruthy()
 expect(screen.queryByTestId('subscription-cancel-notice')).toBeNull()
})
it('clamps accessible progress after downgrade while announcing actual retained usage', () => {
 render(<SubscriptionView summary={{...base,plan:'discovery',usage:{orders:105,drivers:5,users:3},limits:{orders:100,drivers:1,users:1}}} {...props} />)
 for(const [key,used,limit] of [['orders',105,100],['drivers',5,1],['users',3,1]] as const){
  const progress=within(screen.getByTestId(`subscription-usage-${key}`)).getByRole('progressbar')
  expect(progress.getAttribute('aria-valuenow')).toBe(String(limit))
  expect(progress.getAttribute('aria-valuetext')).toBe(`${used} sur ${limit}`)
 }
})

it('présente le choix annuel du nouveau propriétaire sans lancer de paiement',()=>{
 const checkout=vi.fn()
 render(<SubscriptionView summary={{...base,plan:'discovery',status:'free',cycle:null}} {...props} onCheckout={checkout} selectedIntent={{plan:'pro',cycle:'yearly',userId:'owner'}} />)
 expect(screen.getByTestId('subscription-cycle-yearly').getAttribute('aria-pressed')).toBe('true')
 expect(screen.getByTestId('subscription-selected-intent').textContent?.replace(/\s/g,' ')).toContain('48 000 FCFA / an')
 expect(checkout).not.toHaveBeenCalled()
 fireEvent.click(screen.getByTestId('subscription-choose-pro'))
 expect(checkout).toHaveBeenCalledWith('pro','yearly')
})
it('ne change pas le renouvellement d’un client déjà payant selon une ancienne intention',()=>{
 render(<SubscriptionView summary={base} {...props} selectedIntent={{plan:'pro',cycle:'yearly',userId:'owner'}} />)
 expect(screen.getByTestId('subscription-cycle-monthly').getAttribute('aria-pressed')).toBe('true')
 expect(screen.queryByTestId('subscription-selected-intent')).toBeNull()
})
