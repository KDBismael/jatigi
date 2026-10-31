import {expect,it} from 'vitest'
import {translateAuthError} from '@/lib/auth-errors'
it('aligns legacy backend minimum errors with the shared application password policy',()=>{expect(translateAuthError('Password should be at least 6 characters.')).toBe('Le mot de passe doit contenir au moins 8 caractères.')})
it('keeps a stricter hosted minimum and translates the entire message',()=>{expect(translateAuthError('Password should be at least 12 characters.')).toBe('Le mot de passe doit contenir au moins 12 caractères.')})
