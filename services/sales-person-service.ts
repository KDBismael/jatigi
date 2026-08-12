import { createAdminClient } from '@/services/supabase/server'
import type { SalesPerson, SalesPersonEvaluation } from '@/types/sales-person'
import type { SalesPersonEvaluationInput, SalesPersonInput, SalesPersonUpdateInput } from '@/lib/schemas/sales-person.schema'
import { salaryExpenseLabel, shouldGenerateSalaryForMonth } from '@/lib/salary-expenses'

function abidjanToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Abidjan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function currentMonthRange() {
  const today = abidjanToday()
  const [year, month] = today.split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
  return { start, end }
}

async function syncSalaryRecurrence(person: Pick<SalesPerson, 'id' | 'organization_id' | 'full_name' | 'base_salary' | 'salary_mode' | 'hired_on' | 'is_active' | 'ended_on'>) {
  const supabase = await createAdminClient()
  const { data: existing } = await supabase
    .from('expense_recurrences')
    .select('id')
    .eq('organization_id', person.organization_id)
    .eq('sales_person_id', person.id)
    .eq('category', 'salary')
    .maybeSingle()

  const monthStart = abidjanToday().slice(0, 7) + '-01'
  const shouldAuto = shouldGenerateSalaryForMonth(person, monthStart)

  if (!shouldAuto) {
    if (existing?.id) {
      await supabase
        .from('expense_recurrences')
        .update({ is_active: false, ends_on: person.ended_on ?? abidjanToday() })
        .eq('id', existing.id)
        .eq('organization_id', person.organization_id)
    }
    return
  }

  const payload = {
    organization_id: person.organization_id,
    category: 'salary',
    label: salaryExpenseLabel(person.full_name),
    amount: person.base_salary,
    day_of_month: 1,
    starts_on: person.hired_on,
    ends_on: null,
    is_active: true,
    sales_person_id: person.id,
  }

  if (existing?.id) {
    await supabase
      .from('expense_recurrences')
      .update(payload)
      .eq('id', existing.id)
      .eq('organization_id', person.organization_id)
  } else {
    await supabase.from('expense_recurrences').insert(payload)
  }
}

export async function getSalesPeople(organizationId: string): Promise<SalesPerson[]> {
  const supabase = await createAdminClient()
  const { start, end } = currentMonthRange()

  const [peopleResult, ordersResult, evalsResult] = await Promise.all([
    supabase
      .from('sales_people')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_active', { ascending: false })
      .order('full_name', { ascending: true }),
    supabase
      .from('orders')
      .select('seller_id, status, delivered_at, order_lines(unit_price, quantity)')
      .eq('organization_id', organizationId)
      .eq('status', 'delivered')
      .gte('delivered_at', `${start}T00:00:00Z`)
      .lt('delivered_at', `${end}T00:00:00Z`),
    supabase
      .from('sales_person_evaluations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('evaluated_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (peopleResult.error) throw new Error(peopleResult.error.message)
  if (ordersResult.error) throw new Error(ordersResult.error.message)
  if (evalsResult.error) throw new Error(evalsResult.error.message)

  const metrics = new Map<string, { count: number; revenue: number }>()
  for (const order of ordersResult.data ?? []) {
    const sellerId = order.seller_id as string
    const current = metrics.get(sellerId) ?? { count: 0, revenue: 0 }
    current.count += 1
    current.revenue += ((order.order_lines as { unit_price: number; quantity: number }[]) ?? [])
      .reduce((sum, line) => sum + Number(line.unit_price) * line.quantity, 0)
    metrics.set(sellerId, current)
  }

  const latestEval = new Map<string, SalesPersonEvaluation>()
  for (const evaluation of (evalsResult.data ?? []) as SalesPersonEvaluation[]) {
    if (!latestEval.has(evaluation.sales_person_id)) latestEval.set(evaluation.sales_person_id, evaluation)
  }

  return ((peopleResult.data ?? []) as SalesPerson[]).map((person) => ({
    ...person,
    month_order_count: metrics.get(person.id)?.count ?? 0,
    month_revenue: metrics.get(person.id)?.revenue ?? 0,
    latest_evaluation: latestEval.get(person.id) ?? null,
  }))
}

export async function createSalesPerson(input: SalesPersonInput, organizationId: string): Promise<SalesPerson> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('sales_people')
    .insert({
      organization_id: organizationId,
      full_name: input.full_name,
      phone: input.phone || null,
      person_type: input.person_type,
      base_salary: input.base_salary,
      salary_mode: input.salary_mode,
      hired_on: input.hired_on,
      is_active: input.is_active,
      ended_on: input.is_active ? null : abidjanToday(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  const person = data as SalesPerson
  await syncSalaryRecurrence(person)
  return person
}

export async function updateSalesPerson(input: SalesPersonUpdateInput, organizationId: string): Promise<SalesPerson> {
  const supabase = await createAdminClient()
  const update: Record<string, unknown> = { ...input }
  delete update.id
  if ('phone' in update) update.phone = input.phone || null
  if (input.is_active !== undefined) update.ended_on = input.is_active ? null : abidjanToday()

  const { data, error } = await supabase
    .from('sales_people')
    .update(update)
    .eq('id', input.id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  const person = data as SalesPerson
  await syncSalaryRecurrence(person)
  return person
}

export async function deleteSalesPerson(id: string, organizationId: string): Promise<{ deleted: boolean; person?: SalesPerson; message: string }> {
  const supabase = await createAdminClient()
  const { data: person, error: personError } = await supabase
    .from('sales_people')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (personError || !person) throw new Error('Personne commerciale introuvable')

  const [orders, goals, expenses, recurrences, evaluations] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('seller_id', id),
    supabase.from('monthly_goals').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('seller_id', id),
    supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('sales_person_id', id),
    supabase.from('expense_recurrences').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('sales_person_id', id),
    supabase.from('sales_person_evaluations').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('sales_person_id', id),
  ])

  for (const result of [orders, goals, expenses, recurrences, evaluations]) {
    if (result.error) throw new Error(result.error.message)
  }

  const linkedCount = [orders, goals, expenses, recurrences, evaluations]
    .reduce((sum, result) => sum + (result.count ?? 0), 0)

  if (linkedCount > 0) {
    const updated = await updateSalesPerson({ id, is_active: false }, organizationId)
    return {
      deleted: false,
      person: updated,
      message: 'Cette personne a déjà un historique. Elle a été désactivée pour préserver les commandes, objectifs, dépenses et évaluations.',
    }
  }

  const { error } = await supabase
    .from('sales_people')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)
  return { deleted: true, message: 'Personne commerciale supprimée.' }
}

export async function getSalesPersonEvaluations(salesPersonId: string, organizationId: string): Promise<SalesPersonEvaluation[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('sales_person_evaluations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('sales_person_id', salesPersonId)
    .order('evaluated_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as SalesPersonEvaluation[]
}

export async function createSalesPersonEvaluation(
  salesPersonId: string,
  input: SalesPersonEvaluationInput,
  organizationId: string,
  userId: string
): Promise<SalesPersonEvaluation> {
  const supabase = await createAdminClient()
  const { data: person } = await supabase
    .from('sales_people')
    .select('id')
    .eq('id', salesPersonId)
    .eq('organization_id', organizationId)
    .single()
  if (!person) throw new Error('Personne commerciale introuvable')

  const { data, error } = await supabase
    .from('sales_person_evaluations')
    .insert({
      organization_id: organizationId,
      sales_person_id: salesPersonId,
      rating: input.rating,
      note: input.note || null,
      evaluated_on: input.evaluated_on ?? abidjanToday(),
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as SalesPersonEvaluation
}
