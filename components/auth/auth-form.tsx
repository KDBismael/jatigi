'use client'

import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PLANS, type PlanId, type BillingCycle } from '@/lib/billing/plans'
import { formatAmount } from '@/lib/utils'
import { saveBillingIntent } from '@/lib/billing/intent'
import { loginDestination } from '@/lib/onboarding'
import { createClient } from '@/services/supabase/client'
import { PasswordInput } from '@/components/ui/password-input'
import { translateAuthError } from '@/lib/auth-errors'
import { signupSchema, signupApiSchema } from '@/lib/schemas/auth.schema'
import { passwordStrength } from '@/lib/password-strength'
import styles from './auth-form.module.css'

type Mode = 'login' | 'signup'
export function AuthForm({initialMode='login',selectedPlan,selectedCycle}:{initialMode?:Mode;selectedPlan?:PlanId;selectedCycle?:BillingCycle}) {
  const router = useRouter()
  const mode = initialMode
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)
  const strength = passwordStrength(password)
  const matches = password === confirmPassword
  const ready = strength.minimum && strength.mixed && matches && confirmPassword.length > 0
  const planQuery = selectedPlan ? `?plan=${selectedPlan === 'discovery' ? 'decouverte' : selectedPlan}${selectedCycle ? `&cycle=${selectedCycle}` : ''}` : ''
  const signupValues = {email,password,confirmPassword,full_name:fullName,phone,organization_name:orgName}

  function switchMode(next: Mode) { router.replace(`/auth/${next}${planQuery}`) }
  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('Email ou mot de passe incorrect. Vérifiez puis réessayez.'); return }
      const me = await fetch('/api/me').then(r => r.ok ? r.json() : null)
      if (me?.profile?.id) saveBillingIntent(sessionStorage, me.profile.id, selectedPlan, selectedCycle)
      const { data: platformAdmin } = await supabase.from('platform_admins').select('user_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle()
      const progress = me?.profile?.role === 'admin' ? await fetch('/api/onboarding').then(r => r.ok ? r.json() : null).catch(() => null) : null
      window.location.href = loginDestination(me?.profile?.role ?? null, Boolean(platformAdmin), Boolean(progress?.should_start))
    } catch { setError('Connexion impossible. Vérifiez votre connexion puis réessayez.') }
    finally { setLoading(false) }
  }
  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null)
    const form = e.currentTarget
    const parsed = signupSchema.safeParse(signupValues)
    if (!parsed.success) {
      const errors: Record<string,string> = {}
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message
      setFieldErrors(errors)
      const names = ['organization_name','full_name','phone','email','password','confirmPassword']
      const first = names.find(name => errors[name])
      if (first) form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
      return
    }
    setFieldErrors({}); setLoading(true)
    try {
      const body = signupApiSchema.parse(parsed.data)
      const res = await fetch('/api/auth/signup', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      if (!res.ok) {
        const data = await res.json()
        setError(typeof data.error === 'string' ? translateAuthError(data.error) : 'Vérifiez les informations de votre boutique.'); return
      }
      const {error: loginErr} = await createClient().auth.signInWithPassword({email,password})
      if (loginErr) {setError('Compte créé, mais connexion échouée. Veuillez vous connecter manuellement.');return}
      const me = await fetch('/api/me').then(r=>r.ok?r.json():null).catch(()=>null)
      if(me?.profile?.id) saveBillingIntent(sessionStorage,me.profile.id,selectedPlan,selectedCycle)
      window.location.href = '/onboarding'
    } catch {setError('Création impossible. Vérifiez votre connexion puis réessayez.')}
    finally {setLoading(false)}
  }
  const field = (name:string) => ({error:fieldErrors[name],onInput:()=>setFieldErrors(previous=>({...previous,[name]:''}))})
  return <main className={styles.page} data-testid="auth-page">
    <section className={styles.brand}>
      <div><Link href="/" className={styles.logo} aria-label="Warko, accueil"><svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#4F46E5"/><path d="M13 19 23 45 32 29 41 45 51 19" fill="none" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Warko</Link>
      <h1>{mode==='login'?'Content de vous revoir.':<>Votre boutique prête en <em>60 secondes</em>.</>}</h1>
      <p>Commandes, livreurs, reversements et bénéfice au même endroit.</p></div>
      <div className={styles.proof}><div className={styles.preview}><p>Reste dû ce soir</p><strong>42 500 <small>FCFA</small></strong><dl><div><dt>Koffi</dt><dd>28 000</dd></div><div><dt>Ibrahim</dt><dd>14 500</dd></div><div><dt>Serge</dt><dd>Soldé</dd></div></dl></div></div>
    </section>
    <section className={styles.sheet}><div className={styles.content}>
      <nav className={styles.tabs} aria-label="Connexion ou inscription">
        <button type="button" aria-current={mode==='login'?'page':undefined} data-testid="auth-tab-login" onClick={()=>switchMode('login')}>Connexion</button>
        <button type="button" aria-current={mode==='signup'?'page':undefined} data-testid="auth-tab-signup" onClick={()=>switchMode('signup')}>Créer ma boutique</button>
      </nav>
      {mode==='login'?<form className={styles.form} onSubmit={handleLogin} data-testid="login-form">
        <h2>Connectez-vous à votre espace</h2>
        {selectedPlan&&<p className={styles.plan}>Offre choisie : {PLANS[selectedPlan].name} · {formatAmount(PLANS[selectedPlan][selectedCycle ?? 'monthly'])} FCFA{selectedPlan !== 'discovery' && ` / ${selectedCycle === 'yearly' ? 'an' : 'mois'}`}. Aucun paiement à cette étape.</p>}
        {error&&<ErrorBox error={error} testId="login-error"/>}
        <Field label="Email" id="login-email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <div><div className={styles.labelRow}><label htmlFor="login-password">Mot de passe</label><Link href="/auth/forgot-password" data-testid="forgot-password-link">Mot de passe oublié ?</Link></div><PasswordInput id="login-password" data-testid="login-password" toggleTestId="login-password-toggle" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></div>
        <button className={styles.submit} disabled={loading} data-testid="login-submit">{loading?'Connexion…':'Se connecter'}</button>
        <p className={styles.footer}>Pas encore de compte ? <Link href={`/auth/signup${planQuery}`}>Créer ma boutique</Link></p>
      </form>:<form className={styles.form} onSubmit={handleSignup} noValidate data-testid="signup-form">
        <h2>Créez votre boutique</h2>
        {selectedPlan&&<p className={styles.plan} data-testid="signup-selected-plan"><span>Offre choisie : {PLANS[selectedPlan].name} · {formatAmount(PLANS[selectedPlan][selectedCycle ?? 'monthly'])} FCFA{selectedPlan !== 'discovery' && ` / ${selectedCycle === 'yearly' ? 'an' : 'mois'}`}</span> · {selectedPlan === 'discovery' ? 'Gratuit, sans paiement' : 'Paiement à confirmer depuis Abonnement après la création. Aucun paiement à cette étape.'}</p>}
        {error&&<ErrorBox error={error}/>}
        <fieldset><legend>Votre boutique</legend>
          <Field label="Nom de la boutique" id="signup-shop-name" name="organization_name" autoComplete="organization" value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Ex : Boutique Aminata" {...field('organization_name')}/>
          <Field label="Votre nom complet" id="signup-full-name" name="full_name" autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Aminata Diallo" {...field('full_name')}/>
          <Field label="Téléphone" id="signup-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07 00 00 00 00" prefix="+225" {...field('phone')}/>
        </fieldset>
        <fieldset><legend>Votre accès</legend>
          <Field label="Email" id="signup-email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@exemple.com" {...field('email')}/>
          <div><PasswordInput id="signup-password" name="password" label="Mot de passe" autoComplete="new-password" data-testid="signup-password" toggleTestId="signup-password-toggle" visible={visible} onVisibilityChange={setVisible} value={password} onChange={e=>setPassword(e.target.value)} required aria-describedby="signup-password-rules" aria-invalid={!!fieldErrors.password}/>
            <div className={styles.strength} data-testid="signup-password-strength" data-score={strength.score} aria-live="polite"><div>{[1,2,3].map(segment=><span key={segment} data-active={segment<=strength.score}/>)}</div><span>{strength.label}</span></div>
            <ul id="signup-password-rules" className={styles.rules}>{[[strength.minimum,'8 caractères minimum'],[strength.mixed,'Au moins une lettre et un chiffre'],[strength.recommended,'Conseillé : un symbole ou 12 caractères']].map(([valid,label])=><li key={String(label)} data-valid={String(valid)}><Check checked={Boolean(valid)}/>{label}</li>)}</ul>
            {fieldErrors.password&&<p className={styles.fieldError}>{fieldErrors.password}</p>}
          </div>
          <div className={confirmPassword?(matches?styles.matched:styles.mismatched):undefined}><PasswordInput id="signup-password-confirm" name="confirmPassword" label="Confirmer le mot de passe" autoComplete="new-password" data-testid="signup-password-confirm" toggleTestId="signup-password-confirm-toggle" visible={visible} onVisibilityChange={setVisible} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required aria-invalid={(confirmPassword.length>0&&!matches)||!!fieldErrors.confirmPassword} aria-describedby="signup-password-match"/><p id="signup-password-match" data-testid="signup-password-match" aria-live="polite" className={styles.match}>{confirmPassword?(matches?<><Check checked/>Les mots de passe correspondent.</>:'Les deux mots de passe ne correspondent pas.'):fieldErrors.confirmPassword}</p></div>
        </fieldset>
        <button className={styles.submit} data-testid="signup-submit" aria-disabled={!ready||loading} disabled={loading}>{loading?'Création…':'Créer ma boutique'}</button>
        <p className={styles.note}>Vous serez propriétaire de votre boutique. Vous pourrez ensuite ajouter vos employés depuis la page Équipe.</p>
        <p className={styles.footer}>Déjà un compte ? <Link href={`/auth/login${planQuery}`}>Se connecter</Link></p>
      </form>}
      <nav aria-label="Informations Warko" className={styles.legal}><Link href="/conditions">Conditions</Link><Link href="/confidentialite">Confidentialité</Link><Link href="/contact">Contact</Link></nav>
      <Link className={styles.back} href="/">Retour à l&apos;accueil</Link>
    </div></section>
  </main>
}
function Check({checked}:{checked:boolean}) {return <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor"/>{checked&&<path d="m6 10 3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>}</svg>}
function Field({label,id,error,prefix,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;id:string;error?:string;prefix?:string}) {return <div><label className={styles.label} htmlFor={id}>{label}</label><div className={prefix?styles.phone:undefined}>{prefix&&<span>{prefix}</span>}<input {...props} required id={id} data-testid={id} className={styles.input} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined}/></div>{error&&<p className={styles.fieldError} id={`${id}-error`}>{error}</p>}</div>}
function ErrorBox({error,testId}:{error:string;testId?:string}) {return <p className={styles.error} role="alert" data-testid={testId}>{error}</p>}
