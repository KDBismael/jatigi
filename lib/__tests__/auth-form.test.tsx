// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
const mocks=vi.hoisted(()=>({replace:vi.fn(),signIn:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({replace:mocks.replace})}))
vi.mock('@/services/supabase/client',()=>({createClient:()=>({auth:{signInWithPassword:mocks.signIn}})}))
import { AuthForm } from '@/components/auth/auth-form'
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('fetch',vi.fn())})
it('affiche les règles, synchronise les yeux et bloque une confirmation différente',()=>{
 render(<AuthForm initialMode="signup" />)
 fireEvent.change(screen.getByTestId('signup-password'),{target:{value:'abcdefg1'}})
 fireEvent.change(screen.getByTestId('signup-password-confirm'),{target:{value:'abcdefg2'}})
 expect(screen.getByText('Les deux mots de passe ne correspondent pas.')).toBeTruthy()
 fireEvent.click(screen.getByTestId('signup-password-toggle'))
 expect(screen.getByTestId('signup-password').getAttribute('type')).toBe('text')
 expect(screen.getByTestId('signup-password-confirm').getAttribute('type')).toBe('text')
 expect(screen.getByTestId('signup-password-toggle').getAttribute('aria-pressed')).toBe('true')
 fireEvent.click(screen.getByTestId('signup-password-confirm-toggle'))
 expect(screen.getByTestId('signup-password').getAttribute('type')).toBe('password')
 expect(screen.getByTestId('signup-password-confirm').getAttribute('type')).toBe('password')
 expect(screen.getByTestId('signup-submit').getAttribute('aria-disabled')).toBe('true')
 fireEvent.submit(screen.getByTestId('signup-form'))
 expect(fetch).not.toHaveBeenCalled()
 expect(document.activeElement).toBe(screen.getByTestId('signup-shop-name'))
})
it('préserve l’offre dans les changements de route',()=>{
 render(<AuthForm initialMode="signup" selectedPlan="pro" />)
 fireEvent.click(screen.getByTestId('auth-tab-login'))
 expect(mocks.replace).toHaveBeenCalledWith('/auth/login?plan=pro')
})
it('accepte les mots de passe historiques de 6 caractères à la connexion',async()=>{
 mocks.signIn.mockResolvedValue({error:{message:'Invalid login credentials'}})
 render(<AuthForm />)
 fireEvent.change(screen.getByTestId('login-email'),{target:{value:'awa@example.com'}})
 fireEvent.change(screen.getByTestId('login-password'),{target:{value:'abc123'}})
 fireEvent.submit(screen.getByTestId('login-form'))
 await waitFor(()=>expect(mocks.signIn).toHaveBeenCalledWith({email:'awa@example.com',password:'abc123'}))
 expect(screen.getByRole('alert').textContent).toContain('Email ou mot de passe incorrect.')
})

it('envoie seulement les données API après validation, sans confirmation',async()=>{
 vi.mocked(fetch).mockResolvedValue({ok:false,json:async()=>({error:'Email déjà utilisé'})} as Response)
 render(<AuthForm initialMode="signup" />)
 for(const [id,value] of [['signup-shop-name','Awa boutique'],['signup-full-name','Awa'],['signup-phone','0700000000'],['signup-email','awa@example.com'],['signup-password','abcdefg1'],['signup-password-confirm','abcdefg1']]) fireEvent.change(screen.getByTestId(id),{target:{value}})
 expect(screen.getByTestId('signup-submit').getAttribute('aria-disabled')).toBe('false')
 fireEvent.submit(screen.getByTestId('signup-form'))
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1))
 expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({email:'awa@example.com',password:'abcdefg1',phone:'0700000000',full_name:'Awa',organization_name:'Awa boutique'})
})

it('place le focus sur la confirmation différente après les autres champs valides',()=>{
 render(<AuthForm initialMode="signup" />)
 for(const [id,value] of [['signup-shop-name','Awa boutique'],['signup-full-name','Awa'],['signup-phone','0700000000'],['signup-email','awa@example.com'],['signup-password','abcdefg1'],['signup-password-confirm','abcdefg2']]) fireEvent.change(screen.getByTestId(id),{target:{value}})
 fireEvent.submit(screen.getByTestId('signup-form'))
 expect(document.activeElement).toBe(screen.getByTestId('signup-password-confirm'))
 expect(screen.getByTestId('signup-password-confirm').getAttribute('aria-invalid')).toBe('true')
 expect(fetch).not.toHaveBeenCalled()
})
it('ne montre pas de commentaire de maquette dans le formulaire',()=>{render(<AuthForm/>);expect(screen.queryByText(/Exemple illustratif|exemple fictif|données d’exemple/i)).toBeNull()})

it('récapitule le prix annuel et conserve le choix dans la connexion',()=>{
 render(<AuthForm initialMode="signup" selectedPlan="pro" selectedCycle="yearly" />)
 expect(screen.getByTestId('signup-selected-plan').textContent?.replace(/\s/g,' ')).toContain('48 000 FCFA / an')
 fireEvent.click(screen.getByTestId('auth-tab-login'))
 expect(mocks.replace).toHaveBeenCalledWith('/auth/login?plan=pro&cycle=yearly')
 for(const [name,href] of [['Conditions','/conditions'],['Confidentialité','/confidentialite'],['Contact','/contact']]) expect(screen.getByRole('link',{name}).getAttribute('href')).toBe(href)
})
