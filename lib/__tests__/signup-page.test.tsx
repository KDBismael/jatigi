// @vitest-environment jsdom
import React from 'react'
import {render,screen,cleanup} from '@testing-library/react'
import {it,expect,afterEach} from 'vitest'
import SignupPage from '@/app/auth/signup/page'
afterEach(cleanup)
it('opens the signup form directly from the public landing CTA',()=>{
 render(<SignupPage/>);expect(screen.getByText('Créez votre boutique')).toBeTruthy();expect(screen.getAllByRole('button',{name:'Créer ma boutique'})).toHaveLength(2)
})
