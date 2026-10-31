BEGIN;
-- API maintenance is tenant-scoped. Existing system-wide monthly jobs are unchanged.
CREATE OR REPLACE FUNCTION public.generate_org_recurring_expenses(p_organization_id uuid, p_month date)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE inserted_count integer;
BEGIN
  IF p_organization_id IS NULL OR p_month IS NULL OR p_month <> date_trunc('month',p_month)::date THEN
    RAISE EXCEPTION 'INVALID_EXPENSE_PERIOD' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.expenses (
    organization_id, category, label, amount, expense_date,
    recurrence_id, recurrence_month, sales_person_id
  )
  SELECT r.organization_id, r.category, r.label, r.amount,
    p_month + (r.day_of_month - 1), r.id, p_month, r.sales_person_id
  FROM public.expense_recurrences r
  LEFT JOIN public.sales_people sp ON sp.id = r.sales_person_id AND sp.organization_id = r.organization_id
  WHERE r.organization_id = p_organization_id AND r.is_active
    AND r.starts_on <= (p_month + INTERVAL '1 month - 1 day')::date
    AND (r.ends_on IS NULL OR r.ends_on >= p_month)
    AND (r.sales_person_id IS NULL OR (
      sp.id IS NOT NULL AND sp.is_active AND sp.salary_mode = 'automatic'
      AND sp.hired_on <= (p_month + INTERVAL '1 month - 1 day')::date
      AND (sp.ended_on IS NULL OR sp.ended_on >= p_month)
    ))
  ON CONFLICT (recurrence_id, recurrence_month) WHERE recurrence_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_org_recurring_expenses(uuid,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_org_recurring_expenses(uuid,date) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
