-- Existing SaaS installation: update Discovery quota to 100 without resetting usage.
BEGIN;

-- Discovery now includes 100 orders per calendar month. Preserve usage and other quotas.
CREATE OR REPLACE FUNCTION public.enforce_subscription_quota() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid:=NEW.organization_id; v_plan text; v_count integer; v_limit integer; v_month date:=(date_trunc('month',now() AT TIME ZONE 'Africa/Abidjan'))::date;
BEGIN
  IF TG_TABLE_NAME='delivery_drivers' THEN
    IF NOT NEW.is_active THEN RETURN NEW; END IF;
    IF TG_OP='UPDATE' AND OLD.is_active THEN RETURN NEW; END IF;
  END IF;
  -- One organization lock serializes all creates; failed transactions return reservations.
  PERFORM 1 FROM public.organizations WHERE id=v_org FOR UPDATE;
  v_plan:=public.effective_subscription_plan(v_org);
  IF TG_TABLE_NAME='orders' THEN
    INSERT INTO public.organization_usage(organization_id,month) VALUES(v_org,v_month) ON CONFLICT DO NOTHING;
    SELECT orders_count INTO v_count FROM public.organization_usage WHERE organization_id=v_org AND month=v_month FOR UPDATE;
    IF v_plan='discovery' AND v_count>=100 THEN RAISE EXCEPTION 'PLAN_ORDER_LIMIT'; END IF;
    UPDATE public.organization_usage SET orders_count=orders_count+1 WHERE organization_id=v_org AND month=v_month;
  ELSIF TG_TABLE_NAME='delivery_drivers' THEN
    v_limit:=CASE v_plan WHEN 'discovery' THEN 1 WHEN 'pro' THEN 5 ELSE NULL END;
    SELECT count(*) INTO v_count FROM public.delivery_drivers WHERE organization_id=v_org AND is_active AND id<>NEW.id;
    IF v_limit IS NOT NULL AND v_count>=v_limit THEN RAISE EXCEPTION 'PLAN_DRIVER_LIMIT'; END IF;
  ELSE
    v_limit:=CASE v_plan WHEN 'discovery' THEN 1 WHEN 'pro' THEN 3 ELSE NULL END;
    SELECT count(*) INTO v_count FROM public.profiles WHERE organization_id=v_org;
    IF v_limit IS NOT NULL AND v_count>=v_limit THEN RAISE EXCEPTION 'PLAN_USER_LIMIT'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_subscription_quota() FROM PUBLIC,anon,authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
