// @vitest-environment jsdom
import React from 'react'
import {afterEach,expect,it} from 'vitest'
import {cleanup,render,screen} from '@testing-library/react'
import {Input} from '@/components/ui/input'
import {Select} from '@/components/ui/select'
import {signupApiSchema} from '@/lib/schemas/auth.schema'
afterEach(cleanup)
it('rejects malformed telephone text in the shared server signup schema',()=>{const valid={email:'qa@example.com',password:'TestPass123',full_name:'Awa',phone:'0700000000',organization_name:'Boutique'};expect(signupApiSchema.safeParse({...valid,phone:'not a phone'}).success).toBe(false);expect(signupApiSchema.safeParse({...valid,phone:'000'}).success).toBe(false);expect(signupApiSchema.safeParse({...valid,phone:'+225 07 00 00 00 00'}).success).toBe(true)})
it('associates labels without an explicit id and keeps mobile input text readable',()=>{render(<><Input label="Nom du produit"/><Select label="Livreur" options={[{value:'d',label:'Koffi'}]}/></>);expect(screen.getByLabelText('Nom du produit').tagName).toBe('INPUT');expect(screen.getByLabelText('Livreur').tagName).toBe('SELECT');expect(screen.getByLabelText('Nom du produit').className).toContain('text-base');expect(screen.getByLabelText('Livreur').className).toContain('text-base')})
