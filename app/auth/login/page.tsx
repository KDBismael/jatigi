import { AuthForm } from '@/components/auth/auth-form'
import type { PlanId } from '@/lib/billing/plans'

export default async function LoginPage({searchParams}:{searchParams:Promise<{plan?:string|string[];cycle?:string|string[]}>}) {
  const {plan,cycle} = await searchParams
  const selectedPlan:PlanId|undefined = plan==='decouverte'?'discovery':plan==='pro'||plan==='business'?plan:undefined
  return <AuthForm selectedPlan={selectedPlan} selectedCycle={cycle === "yearly" ? "yearly" : "monthly"}/>
}
