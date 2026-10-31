// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
const mocks=vi.hoisted(()=>({update:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}))
vi.mock('@/services/supabase/client',()=>({createClient:()=>({auth:{updateUser:mocks.update}})}))
import ResetPasswordPage from '@/app/auth/reset-password/page'
afterEach(()=>{cleanup();vi.clearAllMocks()})
it.each(['abc123','abcdefgh','12345678'])('refuse %s avant de modifier le mot de passe',password=>{
 render(<ResetPasswordPage />)
 fireEvent.change(screen.getByLabelText('Nouveau mot de passe'),{target:{value:password}})
 fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'),{target:{value:password}})
 fireEvent.submit(screen.getByRole('button',{name:'Enregistrer le nouveau mot de passe'}).closest('form')!)
 expect(mocks.update).not.toHaveBeenCalled()
 expect(screen.getByRole('alert')).toBeTruthy()
})
