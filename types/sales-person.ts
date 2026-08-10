export type SalesPersonType = 'account' | 'internal' | 'external'
export type SalaryMode = 'manual' | 'automatic'

export interface SalesPersonEvaluation {
  id: string
  organization_id: string
  sales_person_id: string
  rating: number
  note: string | null
  evaluated_on: string
  created_by: string | null
  created_at: string
}

export interface SalesPerson {
  id: string
  organization_id: string
  profile_id: string | null
  full_name: string
  phone: string | null
  person_type: SalesPersonType
  base_salary: number
  salary_mode: SalaryMode
  hired_on: string
  ended_on: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  month_order_count?: number
  month_revenue?: number
  latest_evaluation?: SalesPersonEvaluation | null
}

export interface SalesPersonOption {
  id: string
  full_name: string
  person_type?: SalesPersonType
  is_active?: boolean
}
