import { describe, expect, it } from 'vitest'
import { passwordStrength } from '@/lib/password-strength'
import { signupSchema, signupApiSchema } from '@/lib/schemas/auth.schema'
import { inviteEmployeeSchema } from '@/lib/schemas/team.schema'
const valid = { email: 'awa@example.com', password: 'abcdefg1', confirmPassword: 'abcdefg1', full_name: 'Awa', phone: '0700000000', organization_name: 'Boutique' }
describe('nouveaux mots de passe', () => {
  it.each([['',0],['abc',0],['abcdefgh',1],['abcdefg1',2],['abcdefg1!',3],['abcdefghijk1',3]])('évalue %s', (password, score) => expect(passwordStrength(password as string).score).toBe(score))
  it.each(['abc123', 'abcdefgh', '12345678'])('refuse %s au formulaire et à l’API', password => {
    expect(signupSchema.safeParse({...valid,password,confirmPassword:password}).success).toBe(false)
    expect(signupApiSchema.safeParse({...valid,password}).success).toBe(false)
    expect(inviteEmployeeSchema.safeParse({email:valid.email,full_name:'Awa',role:'employee',password}).success).toBe(false)
  })
  it('valide la confirmation uniquement dans le formulaire', () => {
    expect(signupSchema.safeParse({...valid,confirmPassword:'different1'}).success).toBe(false)
    const body={email:valid.email,password:valid.password,full_name:valid.full_name,phone:valid.phone,organization_name:valid.organization_name}
    expect(signupApiSchema.safeParse(body).success).toBe(true)
  })
})
