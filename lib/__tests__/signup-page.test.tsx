// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react'
import {it,expect,afterEach,vi} from 'vitest'
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn()})}))
import SignupPage from '@/app/auth/signup/page'
afterEach(cleanup)
it('opens the signup form directly from the public landing CTA',async()=>{
 render(await SignupPage({searchParams:Promise.resolve({})}));expect(screen.getByText('Créez votre boutique')).toBeTruthy();expect(screen.getAllByRole('button',{name:'Créer ma boutique'})).toHaveLength(2)
})
it.each([['pro','Pro'],['business','Business'],['decouverte','Découverte']])('reads the chosen %s plan without activating or charging it',async(plan,label)=>{
 render(await SignupPage({searchParams:Promise.resolve({plan})}));expect(screen.getByTestId('signup-selected-plan').textContent).toContain(`Offre choisie : ${label}`)
})
it('ignores invalid and repeated plan parameters',async()=>{
 const {unmount}=render(await SignupPage({searchParams:Promise.resolve({plan:'premium-admin'})}));expect(screen.queryByText(/Offre choisie/)).toBeNull();unmount()
 render(await SignupPage({searchParams:Promise.resolve({plan:['pro','business']})}));expect(screen.queryByText(/Offre choisie/)).toBeNull()
})
