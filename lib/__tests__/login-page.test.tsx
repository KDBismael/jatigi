// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
const replace=vi.hoisted(()=>vi.fn())
vi.mock('next/navigation',()=>({useRouter:()=>({replace})}))
import LoginPage from '@/app/auth/login/page'
afterEach(cleanup)
it('préserve le plan choisi au retour vers la création',async()=>{
 render(await LoginPage({searchParams:Promise.resolve({plan:'pro'})}))
 fireEvent.click(screen.getByTestId('auth-tab-signup'))
 expect(replace).toHaveBeenCalledWith('/auth/signup?plan=pro&cycle=monthly')
})
