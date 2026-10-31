// @vitest-environment jsdom
import React from 'react'
import {afterEach,expect,it} from 'vitest'
import {cleanup,render,screen} from '@testing-library/react'
import {LandingFooter} from '@/components/landing/landing-footer'
import {ShowcaseDashboard} from '@/components/landing/showcase-dashboard'
afterEach(cleanup)
it('explains payment and sales without unexplained initials for a new reader',()=>{render(<><LandingFooter/><ShowcaseDashboard/></>);expect(screen.getByTestId('landing-footer').textContent).not.toMatch(/\bCOD\b/);expect(screen.queryByText('CA aujourd’hui')).toBeNull();expect(screen.getByText('Chiffre d’affaires aujourd’hui')).toBeTruthy()})
