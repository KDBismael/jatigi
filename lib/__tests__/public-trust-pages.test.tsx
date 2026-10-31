// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import Conditions from '@/app/(landing)/conditions/page'
import Privacy from '@/app/(landing)/confidentialite/page'
import Contact from '@/app/(landing)/contact/page'
import { LandingFooter } from '@/components/landing/landing-footer'
afterEach(cleanup)
it.each([Conditions,Privacy,Contact])('rend une page publique avec contact et retour accueil',Page=>{
 render(<Page />)
 expect(screen.getByRole('link',{name:'ismaelkondombo1@gmail.com'}).getAttribute('href')).toContain('mailto:ismaelkondombo1@gmail.com')
 expect(screen.getByRole('link',{name:'Retour à l’accueil'}).getAttribute('href')).toBe('/')
 expect(screen.getByRole('heading',{level:1})).toBeTruthy()
})
it('rend les trois liens de confiance dans le pied de page',()=>{
 render(<LandingFooter />)
 for(const [name,path] of [['Conditions','/conditions'],['Confidentialité','/confidentialite'],['Contact','/contact']]) expect(screen.getByRole('link',{name}).getAttribute('href')).toBe(path)
})

it('identifie l’exploitant avec les coordonnées fournies, sans identité inventée',()=>{
 render(<Conditions />)
 expect(screen.getByText(/kdblabs/)).toBeTruthy()
 expect(screen.getByText(/Abidjan.*Côte d’Ivoire/)).toBeTruthy()
})
