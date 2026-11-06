// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SubscriptionSummary } from '@/lib/billing/plans'
const billing=vi.hoisted(()=>({summary:null as SubscriptionSummary|null,error:null as string|null,isLoading:false,busy:false,checkout:vi.fn(),action:vi.fn(),reconcile:vi.fn(),refresh:vi.fn()}))
vi.mock('@/hooks/use-subscription',()=>({useSubscription:()=>billing}))
import SubscriptionPage from '@/app/(app)/subscription/page'
afterEach(()=>{cleanup(); billing.summary=null; billing.error=null; billing.isLoading=false; vi.clearAllMocks();window.history.replaceState({},'','/subscription')})
const summary:SubscriptionSummary={plan:'discovery',cycle:null,status:'free',periodEnd:null,cancelAtPeriodEnd:false,pendingPlan:null,usage:{orders:0,drivers:0,users:1},limits:{orders:100,drivers:1,users:1},canManageBilling:true,payments:[]}
it('keeps loading and retryable errors visible',()=>{
 billing.isLoading=true;billing.error='Lecture impossible'
 render(<SubscriptionPage/>);expect(screen.getByText(/Chargement de votre abonnement/)).toBeTruthy();expect(screen.getByRole('alert').textContent).toContain('Lecture impossible')
 fireEvent.click(screen.getByRole('button',{name:'Actualiser'}));expect(billing.refresh).toHaveBeenCalledOnce()
})
it('reconciles a valid return invoice only when the owner explicitly requests it',async()=>{
 const invoice='01234567-89ab-cdef-0123-456789abcdef';window.history.replaceState({},'','/subscription?invoice='+invoice);billing.summary=summary
 render(<SubscriptionPage/>);await screen.findByRole('status');expect(billing.reconcile).not.toHaveBeenCalled();expect(billing.checkout).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Vérifier ce paiement'}));expect(billing.reconcile).toHaveBeenCalledWith(invoice)
})
it('does not expose return invoice controls for non owners or invalid ids',async()=>{
 window.history.replaceState({},'','/subscription?invoice=invalid');billing.summary=summary
 const {unmount}=render(<SubscriptionPage/>);expect(screen.queryByRole('status')).toBeNull();unmount()
 window.history.replaceState({},'','/subscription?invoice=01234567-89ab-cdef-0123-456789abcdef');billing.summary={...summary,canManageBilling:false}
 render(<SubscriptionPage/>);await screen.findByTestId('subscription-current-plan');expect(screen.queryByRole('status')).toBeNull();expect(screen.queryByRole('button',{name:'Vérifier ce paiement'})).toBeNull()
})
it('replaces the return warning with confirmation once the exact invoice is paid',async()=>{
 const id='01234567-89ab-cdef-0123-456789abcdef';window.history.replaceState({},'','/subscription?invoice='+id)
 const payment={id,plan:'business' as const,cycle:'monthly' as const,amount:100,state:'pending',createdAt:'2026-11-06',paidAt:null,receiptUrl:'/receipt'}
 billing.summary={...summary,plan:'business',status:'active',payments:[payment]}
 const {rerender}=render(<SubscriptionPage/>);await screen.findByRole('status')
 expect(screen.getByRole('status').textContent).toContain('Retour du paiement')
 billing.summary={...billing.summary,payments:[{...payment,state:'paid'}]};rerender(<SubscriptionPage/>)
 expect(screen.getByRole('status').textContent).toContain('Paiement confirmé')
 expect(screen.getByRole('status').textContent).not.toContain('Seule la confirmation')
 expect(screen.queryByRole('button',{name:'Vérifier ce paiement'})).toBeNull()
 expect(billing.reconcile).not.toHaveBeenCalled();expect(billing.checkout).not.toHaveBeenCalled()
})
it('does not treat an active plan or another paid invoice as confirmation of the return invoice',async()=>{
 const id='01234567-89ab-cdef-0123-456789abcdef';window.history.replaceState({},'','/subscription?invoice='+id)
 billing.summary={...summary,plan:'business',status:'active',payments:[{id:'another-invoice',plan:'pro',cycle:'monthly',amount:100,state:'paid',createdAt:'2026-11-06',paidAt:null,receiptUrl:'/receipt'}]}
 render(<SubscriptionPage/>);await screen.findByRole('status')
 expect(screen.getByRole('status').textContent).not.toContain('Paiement confirmé');expect(screen.getByRole('button',{name:'Vérifier ce paiement'})).toBeTruthy()
})
