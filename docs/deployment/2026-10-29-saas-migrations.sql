-- Warko SaaS: the 9 SaaS migrations plus the Discovery 100-order and all-plan live session updates.
-- Run the ENTIRE file in Supabase SQL Editor as the project database owner.
-- Prerequisite: all earlier migrations through 20261029144335_daily_delivery_balance.sql are applied.
-- Run only if NONE of the 11 migrations listed below have already been applied.
-- One transaction: an error rolls back the whole bundle.
-- This manual bundle does not update Supabase CLI migration history.
-- Keep this file outside supabase/migrations to prevent automatic duplicate execution.
-- Billing mode remains TEST. Production keys and email/cron configuration are separate.
-- For an existing SaaS database, run only the separate Discovery quota update instead.
-- Included migrations, in execution order:
-- 20261029163241_saas_subscriptions.sql
-- 20261029163549_shop_onboarding_settings.sql
-- 20261029170001_operations_returns.sql
-- 20261029170002_live_lifecycle.sql
-- 20261029170003_product_variants.sql
-- 20261029170004_product_media.sql
-- 20261029170005_delivery_day_receipts.sql
-- 20261029170006_stock_movement_journal.sql
-- 20261029170007_saas_metrics.sql
-- 20261029170008_discovery_100_orders.sql
-- 20261029170009_live_sessions_all_plans.sql

BEGIN;

-- ============================================================
-- 20261029163241_saas_subscriptions.sql
-- ============================================================

-- All billing mutations are server-only. Browser clients cannot mint entitlements.
CREATE TABLE public.billing_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  mode text NOT NULL DEFAULT 'test' CHECK(mode IN ('test','live'))
);
INSERT INTO public.billing_settings(singleton) VALUES(true);
CREATE TABLE public.organization_subscriptions (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  pending_plan text CHECK(pending_plan IN ('discovery','pro','business')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK(mode IN ('test','live')),
  plan text NOT NULL CHECK(plan IN ('pro','business')),
  cycle text NOT NULL CHECK(cycle IN ('monthly','yearly')),
  amount integer NOT NULL CHECK(amount > 0),
  currency text NOT NULL DEFAULT 'XOF' CHECK(currency='XOF'),
  reference text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  checkout_request jsonb NOT NULL,
  checkout_session_id text,
  checkout_url text,
  payment_id text,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','paid','blocked','expired','reversed')),
  last_payment_status text,
  last_error text,
  retry_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  UNIQUE(mode,reference), UNIQUE(mode,checkout_session_id)
);
CREATE UNIQUE INDEX billing_one_pending_invoice ON public.billing_invoices(organization_id,mode) WHERE state='pending';
CREATE TABLE public.billing_payments (
  mode text NOT NULL,
  payment_id text NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
  status text NOT NULL CHECK(status IN ('pending','paid','failed','expired','reversed')),
  PRIMARY KEY(mode,payment_id)
);
CREATE TABLE public.subscription_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid UNIQUE REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK(plan IN ('pro','business')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL CHECK(period_end>period_start),
  revoked_at timestamptz
);
CREATE INDEX subscription_grants_org_period ON public.subscription_grants(organization_id,period_end);
CREATE TABLE public.organization_usage (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month date NOT NULL,
  orders_count integer NOT NULL DEFAULT 0 CHECK(orders_count>=0),
  PRIMARY KEY(organization_id,month)
);
INSERT INTO public.organization_usage(organization_id,month,orders_count)
  SELECT organization_id,date_trunc('month',created_at AT TIME ZONE 'Africa/Abidjan')::date,count(*)::int
  FROM public.orders GROUP BY organization_id,date_trunc('month',created_at AT TIME ZONE 'Africa/Abidjan')::date;
CREATE TABLE public.moneriz_events (
  id text NOT NULL,
  mode text NOT NULL CHECK(mode IN ('test','live')),
  event jsonb NOT NULL,
  outcome text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY(mode,id)
);
CREATE TABLE public.notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK(channel='email'),
  dedupe_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}',
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','skipped','failed')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text
);
CREATE INDEX notification_jobs_due ON public.notification_jobs(state,available_at);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['billing_settings','organization_subscriptions','billing_invoices','billing_payments','subscription_grants','organization_usage','moneriz_events','notification_jobs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.effective_subscription_plan(p_org uuid,p_now timestamptz DEFAULT now()) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT COALESCE((SELECT g.plan FROM public.subscription_grants g LEFT JOIN public.organization_subscriptions s ON s.organization_id=g.organization_id
    LEFT JOIN public.billing_invoices i ON i.id=g.invoice_id
    WHERE g.organization_id=p_org AND g.revoked_at IS NULL AND g.period_start<=p_now
      AND (g.invoice_id IS NULL OR i.mode=(SELECT mode FROM public.billing_settings WHERE singleton))
      AND (g.period_end>p_now OR (g.period_end+interval '3 days'>p_now AND NOT COALESCE(s.cancel_at_period_end,false) AND s.pending_plan IS NULL))
    ORDER BY (g.period_end>p_now) DESC,CASE g.plan WHEN 'business' THEN 2 ELSE 1 END DESC,g.period_end DESC LIMIT 1),'discovery');
$$;
REVOKE ALL ON FUNCTION public.effective_subscription_plan(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.effective_subscription_plan(uuid,timestamptz) TO service_role;

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
    IF v_plan='discovery' AND v_count>=30 THEN RAISE EXCEPTION 'PLAN_ORDER_LIMIT'; END IF;
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
CREATE TRIGGER billing_order_quota BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_quota();
CREATE TRIGGER billing_driver_quota BEFORE INSERT OR UPDATE OF is_active ON public.delivery_drivers FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_quota();
CREATE TRIGGER billing_user_quota BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_quota();

CREATE OR REPLACE FUNCTION public.prepare_billing_invoice(p_org uuid,p_user uuid,p_mode text,p_plan text,p_cycle text,p_origin text,p_country text DEFAULT 'CI')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v public.billing_invoices; v_amount integer; v_id uuid; v_ref text;
BEGIN
  IF p_mode NOT IN ('test','live') OR p_plan NOT IN ('pro','business') OR p_cycle NOT IN ('monthly','yearly') THEN RAISE EXCEPTION 'INVALID_BILLING_PLAN'; END IF;
  PERFORM 1 FROM public.organizations o JOIN public.profiles p ON p.id=p_user AND p.organization_id=o.id
    WHERE o.id=p_org AND o.owner_id=p_user AND p.role='admin' FOR UPDATE OF o;
  IF NOT FOUND THEN RAISE EXCEPTION 'BILLING_OWNER_REQUIRED'; END IF;
  SELECT * INTO v FROM public.billing_invoices WHERE organization_id=p_org AND mode=p_mode AND state='pending' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF v.plan<>p_plan OR v.cycle<>p_cycle THEN RAISE EXCEPTION 'BILLING_PAYMENT_PENDING'; END IF;
    IF v.retry_after>now() THEN RAISE EXCEPTION 'BILLING_RETRY_LATER'; END IF;
    RETURN to_jsonb(v);
  END IF;
  v_amount:=CASE WHEN p_plan='pro' THEN CASE WHEN p_cycle='monthly' THEN 5000 ELSE 48000 END ELSE CASE WHEN p_cycle='monthly' THEN 10000 ELSE 96000 END END;
  v_id:=gen_random_uuid(); v_ref:='warko-'||p_mode||'-'||v_id;
  INSERT INTO public.billing_invoices(id,organization_id,created_by,mode,plan,cycle,amount,reference,idempotency_key,checkout_request)
    VALUES(v_id,p_org,p_user,p_mode,p_plan,p_cycle,v_amount,v_ref,gen_random_uuid()::text,
      jsonb_build_object('amount',v_amount,'currency','XOF','title',CASE p_plan WHEN 'pro' THEN 'Warko Pro' ELSE 'Warko Business' END,
        'country',p_country,'reference',v_ref,'metadata',jsonb_build_object('orderId',v_id::text,'organizationId',p_org::text),'integrationMode','redirect',
        'successUrl',p_origin||'/subscription?invoice='||v_id::text,'cancelUrl',p_origin||'/subscription?invoice='||v_id::text))
    RETURNING * INTO v;
  RETURN to_jsonb(v);
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_billing_invoice(uuid,uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_billing_invoice(uuid,uuid,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.save_billing_checkout(p_invoice uuid,p_session jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v public.billing_invoices;
BEGIN
  SELECT * INTO v FROM public.billing_invoices WHERE id=p_invoice FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BILLING_INVOICE_NOT_FOUND'; END IF;
  IF p_session->>'mode' IS DISTINCT FROM v.mode OR p_session->>'reference' IS DISTINCT FROM v.reference
    OR (p_session->>'amount')::int IS DISTINCT FROM v.amount OR p_session->>'currency' IS DISTINCT FROM v.currency
    OR p_session#>>'{metadata,organizationId}' IS DISTINCT FROM v.organization_id::text
    OR p_session#>>'{metadata,orderId}' IS DISTINCT FROM v.id::text OR p_session->>'id' NOT LIKE 'cs_%'
    OR (v.checkout_session_id IS NOT NULL AND v.checkout_session_id IS DISTINCT FROM p_session->>'id')
    THEN RAISE EXCEPTION 'BILLING_PAYMENT_MISMATCH'; END IF;
  IF EXISTS(SELECT 1 FROM public.billing_payments bp JOIN public.moneriz_events e ON e.mode=bp.mode AND e.event#>>'{data,payment,id}'=bp.payment_id
      WHERE bp.invoice_id=v.id AND bp.status='paid' AND e.event#>>'{data,payment,metadata,checkoutSessionId}' IS NOT NULL
      AND e.event#>>'{data,payment,metadata,checkoutSessionId}'<>p_session->>'id') THEN RAISE EXCEPTION 'BILLING_PAYMENT_MISMATCH'; END IF;
  UPDATE public.billing_invoices SET checkout_session_id=p_session->>'id',checkout_url=p_session->>'checkoutUrl',last_error=NULL,retry_after=NULL WHERE id=v.id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_billing_checkout(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_billing_checkout(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_moneriz_event(p_mode text,p_event jsonb) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v public.billing_invoices; v_payment jsonb:=p_event#>'{data,payment}'; v_status text; v_previous text; v_start timestamptz; v_end timestamptz; v_owner uuid;
BEGIN
  IF p_mode NOT IN ('test','live') OR p_event->>'id' NOT LIKE 'evt_%' THEN RAISE EXCEPTION 'BILLING_INVALID_EVENT'; END IF;
  INSERT INTO public.moneriz_events(id,mode,event) VALUES(p_event->>'id',p_mode,p_event) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    IF NOT EXISTS(SELECT 1 FROM public.moneriz_events WHERE id=p_event->>'id' AND mode=p_mode AND event=p_event) THEN RAISE EXCEPTION 'BILLING_EVENT_CONFLICT'; END IF;
    RETURN 'duplicate';
  END IF;
  IF p_event->>'type' NOT IN ('payment.succeeded','payment.failed','payment.expired','payment.reversed') THEN
    UPDATE public.moneriz_events SET outcome='ignored',processed_at=now() WHERE mode=p_mode AND id=p_event->>'id'; RETURN 'ignored';
  END IF;
  -- Lock in the same order as checkout preparation to avoid invoice/org deadlocks.
  SELECT * INTO v FROM public.billing_invoices WHERE mode=p_mode AND reference=v_payment->>'reference';
  IF FOUND THEN
    PERFORM 1 FROM public.organizations WHERE id=v.organization_id FOR UPDATE;
    SELECT * INTO v FROM public.billing_invoices WHERE id=v.id FOR UPDATE;
  END IF;
  IF NOT FOUND THEN UPDATE public.moneriz_events SET outcome='unrelated',processed_at=now() WHERE mode=p_mode AND id=p_event->>'id'; RETURN 'unrelated'; END IF;
  IF v_payment->>'mode' IS DISTINCT FROM v.mode OR (v_payment->>'amount')::numeric IS DISTINCT FROM v.amount
    OR v_payment->>'currency' IS DISTINCT FROM 'XOF' OR v_payment#>>'{metadata,orderId}' IS DISTINCT FROM v.id::text
    OR v_payment#>>'{metadata,organizationId}' IS DISTINCT FROM v.organization_id::text OR v_payment->>'id' NOT LIKE 'pay_%'
    OR (v.checkout_session_id IS NOT NULL AND v_payment#>>'{metadata,checkoutSessionId}' IS DISTINCT FROM v.checkout_session_id)
    THEN RAISE EXCEPTION 'BILLING_PAYMENT_MISMATCH'; END IF;
  v_status:=CASE p_event->>'type' WHEN 'payment.succeeded' THEN 'paid' WHEN 'payment.failed' THEN 'failed' WHEN 'payment.expired' THEN 'expired' ELSE 'reversed' END;
  IF v_payment->>'status' IS DISTINCT FROM v_status THEN RAISE EXCEPTION 'BILLING_PAYMENT_MISMATCH'; END IF;
  SELECT status INTO v_previous FROM public.billing_payments WHERE mode=p_mode AND payment_id=v_payment->>'id';
  IF EXISTS(SELECT 1 FROM public.billing_payments WHERE mode=p_mode AND payment_id=v_payment->>'id' AND invoice_id<>v.id) THEN RAISE EXCEPTION 'BILLING_PAYMENT_MISMATCH'; END IF;
  INSERT INTO public.billing_payments(mode,payment_id,invoice_id,status) VALUES(p_mode,v_payment->>'id',v.id,v_status)
    ON CONFLICT(mode,payment_id) DO UPDATE SET status=CASE WHEN billing_payments.status='reversed' THEN 'reversed' WHEN billing_payments.status='paid' AND excluded.status<>'reversed' THEN 'paid' ELSE excluded.status END;
  IF v_status='paid' AND v_previous IS DISTINCT FROM 'reversed' AND v.state<>'paid' AND NOT EXISTS(SELECT 1 FROM public.subscription_grants WHERE invoice_id=v.id) THEN
    PERFORM 1 FROM public.organizations WHERE id=v.organization_id FOR UPDATE;
    v_start:=now();
    SELECT GREATEST(v_start,COALESCE(max(g.period_end),v_start)) INTO v_start FROM public.subscription_grants g LEFT JOIN public.billing_invoices i ON i.id=g.invoice_id
      WHERE g.organization_id=v.organization_id AND g.revoked_at IS NULL AND g.period_end>now()
      AND (g.invoice_id IS NULL OR i.mode=p_mode)
      AND (g.plan=v.plan OR (g.plan='business' AND v.plan='pro'));
    v_end:=v_start+CASE v.cycle WHEN 'monthly' THEN interval '1 month' ELSE interval '1 year' END;
    INSERT INTO public.subscription_grants(organization_id,invoice_id,plan,period_start,period_end) VALUES(v.organization_id,v.id,v.plan,v_start,v_end);
    UPDATE public.billing_invoices SET state='paid',payment_id=v_payment->>'id',paid_at=now(),last_payment_status='paid',last_error=NULL,retry_after=NULL WHERE id=v.id;
    INSERT INTO public.organization_subscriptions(organization_id) VALUES(v.organization_id) ON CONFLICT DO NOTHING;
    UPDATE public.organization_subscriptions SET cancel_at_period_end=false,pending_plan=NULL,updated_at=now() WHERE organization_id=v.organization_id;
    UPDATE public.notification_jobs SET state='skipped' WHERE organization_id=v.organization_id AND kind IN ('renewal_due','grace_reminder') AND state IN ('pending','processing');
    SELECT owner_id INTO v_owner FROM public.organizations WHERE id=v.organization_id;
    INSERT INTO public.notification_jobs(organization_id,recipient_user_id,kind,dedupe_key,payload)
      VALUES(v.organization_id,v_owner,'billing_receipt','receipt:'||v.id::text,jsonb_build_object('invoiceId',v.id,'plan',v.plan,'amount',v.amount,'currency','XOF','periodEnd',v_end,'mode',p_mode)) ON CONFLICT DO NOTHING;
  ELSIF v_status='reversed' AND (v.payment_id IS NULL OR v.payment_id=v_payment->>'id') THEN
    UPDATE public.notification_jobs SET state='skipped' WHERE kind='billing_receipt' AND payload->>'invoiceId'=v.id::text AND state IN ('pending','processing');
    UPDATE public.subscription_grants SET revoked_at=now() WHERE invoice_id=v.id;
    UPDATE public.billing_invoices SET state='reversed',last_payment_status='reversed' WHERE id=v.id;
  ELSIF v.state<>'paid' THEN
    UPDATE public.billing_invoices SET last_payment_status=v_status WHERE id=v.id;
  END IF;
  UPDATE public.moneriz_events SET outcome='processed',processed_at=now() WHERE mode=p_mode AND id=p_event->>'id';
  RETURN 'processed';
END;
$$;
REVOKE ALL ON FUNCTION public.apply_moneriz_event(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_moneriz_event(text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_notification_jobs(p_limit integer DEFAULT 5) RETURNS SETOF public.notification_jobs
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  UPDATE public.notification_jobs SET state='processing',attempts=attempts+1,lease_until=now()+interval '3 minutes'
    WHERE id IN (SELECT id FROM public.notification_jobs WHERE available_at<=now() AND (state='pending' OR (state='processing' AND lease_until<now()))
      ORDER BY available_at,id LIMIT GREATEST(1,LEAST(p_limit,20)) FOR UPDATE SKIP LOCKED) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_notification_jobs(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_manager_order_writes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='manager') THEN
    IF TG_TABLE_NAME='order_lines' OR TG_OP='INSERT' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
    IF NEW.delivery_driver_id IS NULL OR NEW.status NOT IN ('in_progress','delivered','cancelled','postponed','returned')
      OR (to_jsonb(NEW)-ARRAY['status','delivered_at','discounts_locked_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','delivered_at','discounts_locked_at','updated_at']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_manager_order_writes() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER manager_order_writes BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_manager_order_writes();
CREATE TRIGGER manager_line_writes BEFORE UPDATE ON public.order_lines FOR EACH ROW EXECUTE FUNCTION public.guard_manager_order_writes();

CREATE OR REPLACE FUNCTION public.has_detailed_delivery_access(p_date date) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid:=public.current_org_id();v_plan text;
BEGIN
 IF auth.uid() IS NULL OR v_org IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','manager')) THEN RETURN false; END IF;
 v_plan:=public.effective_subscription_plan(v_org);
 RETURN v_plan='business' OR (v_plan='pro' AND p_date >= (now() AT TIME ZONE 'Africa/Abidjan')::date-29);
END $$;
REVOKE ALL ON FUNCTION public.has_detailed_delivery_access(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_detailed_delivery_access(date) TO authenticated,service_role;
DROP POLICY "Delivery managers read own daily assignments" ON public.order_delivery_assignments;
CREATE POLICY "Delivery managers read entitled assignments" ON public.order_delivery_assignments FOR SELECT TO authenticated
 USING(organization_id=(SELECT public.current_org_id()) AND public.has_detailed_delivery_access(assignment_date));

CREATE OR REPLACE FUNCTION public.guard_live_subscription() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' OR (NEW.status='active' AND NEW.status IS DISTINCT FROM OLD.status) THEN
   PERFORM 1 FROM public.organizations WHERE id=NEW.organization_id FOR UPDATE;
   IF public.effective_subscription_plan(NEW.organization_id)='discovery' THEN RAISE EXCEPTION 'PLAN_LIVE_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_live_subscription() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER live_subscription_gate BEFORE INSERT OR UPDATE OF status ON public.live_sessions FOR EACH ROW EXECUTE FUNCTION public.guard_live_subscription();

-- Seller/live attribution must commit with FIFO and quota reservations, never after.
CREATE OR REPLACE FUNCTION public.create_order_complete(p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid:=public.current_org_id();v_id uuid;v_live uuid:=NULLIF(p_data->>'live_session_id','')::uuid;v_status text;
BEGIN
 IF auth.uid() IS NULL OR v_org IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sales_people WHERE id=(p_data->>'seller_id')::uuid AND organization_id=v_org AND is_active) THEN RAISE EXCEPTION 'INVALID_SELLER'; END IF;
 IF v_live IS NOT NULL THEN
   IF public.effective_subscription_plan(v_org)='discovery' THEN RAISE EXCEPTION 'PLAN_LIVE_REQUIRED'; END IF;
   SELECT status INTO v_status FROM public.live_sessions WHERE id=v_live AND organization_id=v_org FOR SHARE;
   IF v_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'LIVE_SESSION_NOT_ACTIVE'; END IF;
 END IF;
 v_id:=public.create_order_with_fifo(p_data->>'client_name',p_data->>'client_phone',p_data->>'channel',(p_data->>'order_date')::date,
   NULLIF(p_data->>'delivery_driver_id','')::uuid,p_data->>'delivery_location',COALESCE((p_data->>'delivery_fee')::numeric,0),
   COALESCE((p_data->>'confirmation_amount')::numeric,0),NULLIF(p_data->>'payment_method',''),p_data->'lines',NULLIF(p_data->>'delivery_date','')::date);
 UPDATE public.orders SET seller_id=(p_data->>'seller_id')::uuid,live_session_id=v_live WHERE id=v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_order_complete(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_order_complete(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_order_live_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_status text;
BEGIN
 IF NEW.live_session_id IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.live_session_id IS NOT DISTINCT FROM OLD.live_session_id THEN RETURN NEW; END IF;
 IF public.effective_subscription_plan(NEW.organization_id)='discovery' THEN RAISE EXCEPTION 'PLAN_LIVE_REQUIRED'; END IF;
 SELECT status INTO v_status FROM public.live_sessions WHERE id=NEW.live_session_id AND organization_id=NEW.organization_id FOR SHARE;
 IF v_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'LIVE_SESSION_NOT_ACTIVE'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_order_live_assignment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER order_live_assignment BEFORE INSERT OR UPDATE OF live_session_id ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_order_live_assignment();

-- ============================================================
-- 20261029163549_shop_onboarding_settings.sql
-- ============================================================

-- Shop configuration and resumable onboarding. Completion is derived from real rows,
-- never from these UI progress fields. Writes use tenant/admin-scoped server routes.
ALTER TABLE public.organizations
  ADD COLUMN country text NOT NULL DEFAULT 'CI' CHECK (country IN ('SN','CI','BF','ML','TG','BJ')),
  ADD COLUMN currency text NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  ADD COLUMN default_delivery_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (default_delivery_fee >= 0),
  ADD COLUMN onboarding_step smallint CHECK (onboarding_step BETWEEN 1 AND 3),
  ADD COLUMN onboarding_skipped_steps integer[] NOT NULL DEFAULT '{}' CHECK (onboarding_skipped_steps <@ ARRAY[1,2,3]),
  ADD COLUMN onboarding_started_at timestamptz,
  ADD COLUMN notifications_unsubscribed_at timestamptz;

-- ============================================================
-- 20261029170001_operations_returns.sql
-- ============================================================

ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK(status IN ('received','confirmed','in_progress','delivered','cancelled','postponed','returned'));
CREATE OR REPLACE FUNCTION public.record_delivery_day() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_amount numeric;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF OLD.delivery_date IS NOT NULL AND OLD.delivery_driver_id IS NOT NULL
      AND (NEW.delivery_date IS DISTINCT FROM OLD.delivery_date OR NEW.delivery_driver_id IS DISTINCT FROM OLD.delivery_driver_id) THEN
      UPDATE public.order_delivery_assignments SET status='postponed'
        WHERE order_id=OLD.id AND driver_id=OLD.delivery_driver_id AND assignment_date=OLD.delivery_date AND status NOT IN ('delivered','cancelled');
    END IF;
  END IF;
  IF NEW.delivery_date IS NULL OR NEW.delivery_driver_id IS NULL THEN RETURN NEW; END IF;
  SELECT GREATEST(0,COALESCE(SUM(line_total),0)-NEW.confirmation_amount) INTO v_amount
    FROM public.order_lines WHERE order_id=NEW.id;
  INSERT INTO public.order_delivery_assignments(organization_id,order_id,driver_id,assignment_date,status,remittable_amount)
    VALUES(NEW.organization_id,NEW.id,NEW.delivery_driver_id,NEW.delivery_date,
      CASE WHEN NEW.status IN ('received','confirmed') THEN 'in_progress' WHEN NEW.status='returned' THEN 'cancelled' ELSE NEW.status END,v_amount)
    ON CONFLICT(order_id,driver_id,assignment_date) DO UPDATE SET driver_id=excluded.driver_id,status=excluded.status,remittable_amount=excluded.remittable_amount;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_delivery_day() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION update_order_status_safe(p_order_id UUID, p_status TEXT)
RETURNS VOID AS $$
DECLARE
  v_org UUID := current_org_id();
  v_current TEXT;
  v_alloc RECORD;
BEGIN
  IF p_status NOT IN ('received','confirmed','in_progress','delivered','cancelled','postponed','returned') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;
  SELECT status INTO v_current FROM orders
    WHERE id = p_order_id AND organization_id = v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_current IN ('cancelled','returned') AND p_status <> v_current THEN RAISE EXCEPTION 'CANCELLED_ORDER_IS_FINAL'; END IF;

  IF p_status IN ('cancelled','returned') AND v_current NOT IN ('cancelled','returned') THEN
    PERFORM set_config('warko.stock_order',p_order_id::text,true);
    PERFORM set_config('warko.stock_reason','return',true);
    FOR v_alloc IN
      SELECT oll.lot_id, oll.quantity_allocated, ol.product_id
      FROM order_line_lots oll JOIN order_lines ol ON ol.id = oll.order_line_id
      WHERE ol.order_id = p_order_id
    LOOP
      UPDATE stock_lots SET quantity_available = quantity_available + v_alloc.quantity_allocated
        WHERE id = v_alloc.lot_id;
      UPDATE products SET stock_quantity = stock_quantity + v_alloc.quantity_allocated
        WHERE id = v_alloc.product_id;
    END LOOP;
  END IF;
  PERFORM set_config('warko.stock_order','',true);
  PERFORM set_config('warko.stock_reason','',true);
  UPDATE orders SET status = p_status WHERE id = p_order_id AND organization_id = v_org;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp;
REVOKE ALL ON FUNCTION update_order_status_safe(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_order_status_safe(UUID, TEXT) TO authenticated;

-- ============================================================
-- 20261029170002_live_lifecycle.sql
-- ============================================================

ALTER TABLE public.live_sessions DROP CONSTRAINT live_sessions_status_check;
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_status_check CHECK(status IN ('planned','active','completed','cancelled'));
ALTER TABLE public.live_sessions ADD COLUMN started_at timestamptz, ADD COLUMN closed_at timestamptz;

-- ============================================================
-- 20261029170003_product_variants.sql
-- ============================================================

CREATE TABLE public.product_variants(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 stock_quantity integer NOT NULL DEFAULT 0 CHECK(stock_quantity>=0),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(product_id,name), UNIQUE(id,product_id,organization_id)
);
CREATE INDEX product_variants_org_product_idx ON public.product_variants(organization_id,product_id);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_variants FROM anon,authenticated;
GRANT SELECT ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
CREATE POLICY "Read own variants" ON public.product_variants FOR SELECT TO authenticated USING(organization_id=(SELECT current_org_id()) AND EXISTS(SELECT 1 FROM profiles WHERE id=(SELECT auth.uid()) AND role IN ('admin','employee')));
ALTER TABLE public.stock_lots ADD COLUMN variant_id uuid;
ALTER TABLE public.stock_lots ADD CONSTRAINT stock_lots_variant_fkey FOREIGN KEY(variant_id,product_id,organization_id) REFERENCES public.product_variants(id,product_id,organization_id);
CREATE INDEX stock_lots_variant_fifo_idx ON public.stock_lots(product_id,variant_id,received_at,id) WHERE quantity_available>0;
ALTER TABLE public.order_lines ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT, ADD COLUMN variant_name text;
CREATE FUNCTION public.sync_variant_quantity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP<>'INSERT' AND OLD.variant_id IS NOT NULL THEN UPDATE product_variants SET stock_quantity=stock_quantity-OLD.quantity_available WHERE id=OLD.variant_id; END IF;
 IF TG_OP<>'DELETE' AND NEW.variant_id IS NOT NULL THEN UPDATE product_variants SET stock_quantity=stock_quantity+NEW.quantity_available WHERE id=NEW.variant_id; END IF;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_variant_quantity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stock_lots_sync_variant AFTER INSERT OR UPDATE OF quantity_available,variant_id OR DELETE ON public.stock_lots FOR EACH ROW EXECUTE FUNCTION public.sync_variant_quantity();
CREATE OR REPLACE FUNCTION add_stock_lot_safe(
  p_product_id UUID,p_quantity INTEGER,p_total_purchase NUMERIC,p_total_transport NUMERIC,
  p_total_packaging NUMERIC,p_received_at TIMESTAMPTZ,p_variant_id UUID
) RETURNS UUID AS $$
DECLARE v_org UUID:=current_org_id(); v_lot_id UUID; v_sale_price NUMERIC;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND organization_id=v_org)
    THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_quantity<=0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  SELECT sale_price INTO v_sale_price FROM products WHERE id=p_product_id AND organization_id=v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF NOT EXISTS(SELECT 1 FROM product_variants WHERE id=p_variant_id AND product_id=p_product_id AND organization_id=v_org AND is_active=true) THEN RAISE EXCEPTION 'INVALID_PRODUCT_VARIANT'; END IF;
  INSERT INTO stock_lots(product_id,organization_id,variant_id,quantity_received,quantity_available,purchase_cost,
    import_cost,import_cost_type,import_cost_raw,import_batch_size,packaging_cost,unit_cost,sale_price,received_at)
  VALUES(p_product_id,v_org,p_variant_id,p_quantity,p_quantity,p_total_purchase/p_quantity,p_total_transport/p_quantity,'lot',
    p_total_transport,p_quantity,p_total_packaging/p_quantity,
    (p_total_purchase+p_total_transport+p_total_packaging)/p_quantity,v_sale_price,COALESCE(p_received_at,NOW()))
  RETURNING id INTO v_lot_id;
  UPDATE products SET stock_quantity=stock_quantity+p_quantity,purchase_cost=p_total_purchase/p_quantity,
    import_cost=p_total_transport/p_quantity,import_cost_type='lot',import_cost_raw=p_total_transport,
    import_batch_size=p_quantity,packaging_cost=p_total_packaging/p_quantity
  WHERE id=p_product_id AND organization_id=v_org;
  RETURN v_lot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;
REVOKE ALL ON FUNCTION add_stock_lot_safe(UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ,UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION add_stock_lot_safe(UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ,UUID) TO authenticated;


CREATE OR REPLACE FUNCTION create_order_with_fifo(
  p_client_name TEXT, p_client_phone TEXT, p_channel TEXT, p_order_date DATE,
  p_delivery_driver_id UUID, p_delivery_location TEXT, p_delivery_fee NUMERIC,
  p_confirmation_amount NUMERIC, p_payment_method TEXT, p_lines JSONB, p_delivery_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_org UUID := current_org_id(); v_order_id UUID; v_line JSONB; v_product RECORD;
  v_variant RECORD; v_variant_name TEXT; v_variant_id UUID; v_offer RECORD; v_line_id UUID; v_lot RECORD; v_remaining INTEGER;
  v_allocated INTEGER; v_total_cost NUMERIC; v_confirmation NUMERIC := COALESCE(p_confirmation_amount,0);
  v_delivery_fee NUMERIC := COALESCE(p_delivery_fee,0); v_pricing_type TEXT;
  v_discount_type TEXT; v_discount_value NUMERIC; v_discount_amount NUMERIC; v_discount_reason TEXT;
  v_requested_count INTEGER; v_stock_quantity INTEGER; v_line_total NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'EMPTY_ORDER'; END IF;
  IF jsonb_array_length(p_lines) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'EMPTY_ORDER'; END IF;
  IF v_delivery_fee < 0 THEN RAISE EXCEPTION 'INVALID_DELIVERY_FEE'; END IF;
  IF p_delivery_driver_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM delivery_drivers WHERE id=p_delivery_driver_id AND organization_id=v_org
  ) THEN RAISE EXCEPTION 'INVALID_DELIVERY_DRIVER'; END IF;

  INSERT INTO orders (client_name,client_phone,channel,order_date,status,created_by,
    organization_id,delivery_driver_id,delivery_location,delivery_fee,confirmation_amount,payment_method,delivery_date)
  VALUES (p_client_name,p_client_phone,p_channel,p_order_date,
    CASE WHEN v_confirmation>0 THEN 'confirmed' ELSE 'received' END,
    auth.uid(),v_org,p_delivery_driver_id,p_delivery_location,v_delivery_fee,v_confirmation,
    CASE WHEN v_confirmation>0 THEN p_payment_method ELSE NULL END,p_delivery_date)
  RETURNING id INTO v_order_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    SELECT id,sale_price,pricing_mode INTO v_product FROM products
      WHERE id=(v_line->>'product_id')::UUID AND organization_id=v_org AND is_active=TRUE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
    v_variant_name:=NULL;
    v_variant_id:=NULLIF(v_line->>'variant_id','')::uuid;
    IF v_variant_id IS NOT NULL THEN
      SELECT id,name INTO v_variant FROM product_variants WHERE id=v_variant_id AND product_id=v_product.id AND organization_id=v_org AND is_active=true;
      IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_PRODUCT_VARIANT'; END IF;
      v_variant_name:=v_variant.name;
    END IF;
    v_pricing_type := COALESCE(v_line->>'pricing_type','unit');

    IF v_pricing_type = 'offer' THEN
      IF v_product.pricing_mode NOT IN ('offers','both') THEN RAISE EXCEPTION 'OFFERS_NOT_ALLOWED'; END IF;
      SELECT id,name,units_per_offer,price INTO v_offer FROM product_offers
        WHERE id=(v_line->>'offer_id')::UUID AND product_id=v_product.id
          AND organization_id=v_org AND is_active=TRUE;
      IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_NOT_FOUND'; END IF;
      v_requested_count := (v_line->>'offer_count')::INTEGER;
      IF v_requested_count <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      v_stock_quantity := v_offer.units_per_offer * v_requested_count;
      v_line_total := v_offer.price * v_requested_count;
      INSERT INTO order_lines (order_id,product_id,quantity,unit_price,unit_cost,pricing_type,
        product_offer_id,offer_name,units_per_offer,offer_count,offer_price,line_total,line_subtotal,total_cost)
      VALUES (v_order_id,v_product.id,v_stock_quantity,NULL,0,'offer',v_offer.id,v_offer.name,
        v_offer.units_per_offer,v_requested_count,v_offer.price,v_line_total,v_line_total,0)
      RETURNING id INTO v_line_id;
    ELSIF v_pricing_type = 'unit' THEN
      IF v_product.pricing_mode NOT IN ('unit','both') THEN RAISE EXCEPTION 'UNIT_SALES_NOT_ALLOWED'; END IF;
      v_requested_count := (v_line->>'quantity')::INTEGER;
      IF v_requested_count <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      v_stock_quantity := v_requested_count;
      v_line_total := v_product.sale_price * v_requested_count;
      INSERT INTO order_lines (order_id,product_id,quantity,unit_price,unit_cost,pricing_type,line_total,line_subtotal,total_cost)
      VALUES (v_order_id,v_product.id,v_stock_quantity,v_product.sale_price,0,'unit',v_line_total,v_line_total,0)
      RETURNING id INTO v_line_id;
    ELSE RAISE EXCEPTION 'INVALID_PRICING_TYPE';
    END IF;

    UPDATE order_lines SET variant_id=v_variant_id,variant_name=v_variant_name WHERE id=v_line_id;
    v_discount_type:=COALESCE(v_line->>'discount_type','none');
    v_discount_value:=COALESCE((v_line->>'discount_value')::NUMERIC,0);
    v_discount_reason:=NULLIF(trim(v_line->>'discount_reason'),'');
    v_discount_amount:=calculate_line_discount(v_line_total,v_discount_type,v_discount_value,v_discount_reason);
    UPDATE order_lines SET line_total=v_line_total-v_discount_amount,
      discount_type=CASE WHEN v_discount_value=0 THEN 'none' ELSE v_discount_type END,
      discount_value=v_discount_value,discount_amount=v_discount_amount,
      discount_reason=CASE WHEN v_discount_value=0 THEN NULL ELSE v_discount_reason END,
      discount_applied_by=CASE WHEN v_discount_value=0 THEN NULL ELSE auth.uid() END,
      discount_applied_at=CASE WHEN v_discount_value=0 THEN NULL ELSE NOW() END
      WHERE id=v_line_id;
    PERFORM set_config('warko.stock_order',v_order_id::text,true);
    PERFORM set_config('warko.stock_reason','sale',true);
    v_remaining := v_stock_quantity; v_total_cost := 0;
    FOR v_lot IN SELECT * FROM stock_lots WHERE product_id=v_product.id
      AND organization_id=v_org AND variant_id IS NOT DISTINCT FROM v_variant_id AND quantity_available>0 ORDER BY received_at,id FOR UPDATE LOOP
      EXIT WHEN v_remaining=0;
      v_allocated := LEAST(v_lot.quantity_available,v_remaining);
      UPDATE stock_lots SET quantity_available=quantity_available-v_allocated WHERE id=v_lot.id;
      INSERT INTO order_line_lots(order_line_id,lot_id,quantity_allocated,unit_cost)
        VALUES(v_line_id,v_lot.id,v_allocated,v_lot.unit_cost);
      v_total_cost := v_total_cost + v_allocated*v_lot.unit_cost;
      v_remaining := v_remaining-v_allocated;
    END LOOP;
    IF v_remaining>0 THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
    UPDATE order_lines SET unit_cost=v_total_cost/v_stock_quantity,total_cost=v_total_cost WHERE id=v_line_id;
    UPDATE products SET stock_quantity=stock_quantity-v_stock_quantity WHERE id=v_product.id;
  END LOOP;
  IF (SELECT COALESCE(SUM(line_total),0) FROM order_lines WHERE order_id=v_order_id)+v_delivery_fee<v_confirmation
    THEN RAISE EXCEPTION 'DEPOSIT_EXCEEDS_TOTAL'; END IF;
  PERFORM set_config('warko.stock_order','',true);
  PERFORM set_config('warko.stock_reason','',true);
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp;
REVOKE ALL ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB,DATE) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB,DATE) TO authenticated;

-- ============================================================
-- 20261029170004_product_media.sql
-- ============================================================

CREATE TABLE public.product_images(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 storage_path text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_org_product_idx ON public.product_images(organization_id,product_id);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_images FROM anon,authenticated;
GRANT ALL ON public.product_images TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('product-images','product-images',false,2097152,ARRAY['image/png','image/jpeg']) ON CONFLICT(id) DO NOTHING;

-- ============================================================
-- 20261029170005_delivery_day_receipts.sql
-- ============================================================

ALTER TABLE public.order_delivery_assignments ADD COLUMN collected_amount numeric(12,2) CHECK(collected_amount>=0);
CREATE OR REPLACE FUNCTION public.record_delivery_day() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_amount numeric; v_collected numeric;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF OLD.delivery_date IS NOT NULL AND OLD.delivery_driver_id IS NOT NULL
      AND (NEW.delivery_date IS DISTINCT FROM OLD.delivery_date OR NEW.delivery_driver_id IS DISTINCT FROM OLD.delivery_driver_id) THEN
      UPDATE public.order_delivery_assignments SET status='postponed'
        WHERE order_id=OLD.id AND driver_id=OLD.delivery_driver_id AND assignment_date=OLD.delivery_date AND status NOT IN ('delivered','cancelled');
    END IF;
  END IF;
  IF NEW.delivery_date IS NULL OR NEW.delivery_driver_id IS NULL THEN RETURN NEW; END IF;
  SELECT GREATEST(0,COALESCE(SUM(line_total),0)-NEW.confirmation_amount) INTO v_amount
    FROM public.order_lines WHERE order_id=NEW.id;
  SELECT GREATEST(0,COALESCE(SUM(line_total),0)+NEW.delivery_fee-NEW.confirmation_amount) INTO v_collected FROM public.order_lines WHERE order_id=NEW.id;
  INSERT INTO public.order_delivery_assignments(organization_id,order_id,driver_id,assignment_date,status,remittable_amount,collected_amount)
    VALUES(NEW.organization_id,NEW.id,NEW.delivery_driver_id,NEW.delivery_date,
      CASE WHEN NEW.status IN ('received','confirmed') THEN 'in_progress' WHEN NEW.status='returned' THEN 'cancelled' ELSE NEW.status END,v_amount,v_collected)
    ON CONFLICT(order_id,driver_id,assignment_date) DO UPDATE SET driver_id=excluded.driver_id,status=excluded.status,remittable_amount=excluded.remittable_amount,collected_amount=excluded.collected_amount;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_delivery_day() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.refresh_delivery_day_amount() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order uuid;
BEGIN
  v_order:=CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END;
  UPDATE public.order_delivery_assignments a
    SET collected_amount=GREATEST(0,(SELECT COALESCE(SUM(l.line_total),0) FROM public.order_lines l WHERE l.order_id=v_order)+o.delivery_fee-o.confirmation_amount),
      remittable_amount=GREATEST(0,(SELECT COALESCE(SUM(l.line_total),0) FROM public.order_lines l WHERE l.order_id=v_order)-o.confirmation_amount)
    FROM public.orders o WHERE o.id=v_order AND a.order_id=o.id AND a.driver_id=o.delivery_driver_id AND a.assignment_date=o.delivery_date;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_delivery_day_amount() FROM PUBLIC,anon,authenticated;

-- ============================================================
-- 20261029170006_stock_movement_journal.sql
-- ============================================================

CREATE TABLE public.stock_movements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
 lot_id uuid NOT NULL REFERENCES public.stock_lots(id) ON DELETE RESTRICT,
 variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
 order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
 quantity_delta integer NOT NULL CHECK(quantity_delta<>0),
 reason text NOT NULL CHECK(reason IN ('receipt','sale','return','adjustment')),
 occurred_at timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 reconstructed boolean NOT NULL DEFAULT false
);
CREATE INDEX stock_movements_product_time_idx ON public.stock_movements(organization_id,product_id,recorded_at DESC,id);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stock_movements FROM anon,authenticated;
GRANT ALL ON public.stock_movements TO service_role;
-- Reconstruct only facts evidenced by original lots and durable FIFO allocations.
-- Old adjustments cannot be recovered. Return dates were never recorded, so remain NULL.
INSERT INTO public.stock_movements(organization_id,product_id,lot_id,variant_id,quantity_delta,reason,occurred_at,reconstructed)
 SELECT organization_id,product_id,id,variant_id,quantity_received,'receipt',received_at,true FROM stock_lots WHERE quantity_received>0;
INSERT INTO public.stock_movements(organization_id,product_id,lot_id,variant_id,order_id,quantity_delta,reason,occurred_at,created_by,reconstructed)
 SELECT o.organization_id,ol.product_id,a.lot_id,ol.variant_id,o.id,-a.quantity_allocated,'sale',o.created_at,o.created_by,true
 FROM order_line_lots a JOIN order_lines ol ON ol.id=a.order_line_id JOIN orders o ON o.id=ol.order_id;
INSERT INTO public.stock_movements(organization_id,product_id,lot_id,variant_id,order_id,quantity_delta,reason,occurred_at,reconstructed)
 SELECT o.organization_id,ol.product_id,a.lot_id,ol.variant_id,o.id,a.quantity_allocated,'return',NULL,true
 FROM order_line_lots a JOIN order_lines ol ON ol.id=a.order_line_id JOIN orders o ON o.id=ol.order_id WHERE o.status IN ('cancelled','returned');
CREATE FUNCTION public.record_stock_movement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_delta integer; v_reason text; v_order uuid;
BEGIN
 v_delta:=NEW.quantity_available-CASE WHEN TG_OP='INSERT' THEN 0 ELSE OLD.quantity_available END;
 IF v_delta=0 THEN RETURN NULL; END IF;
 v_reason:=NULLIF(current_setting('warko.stock_reason',true),'');
 v_order:=NULLIF(current_setting('warko.stock_order',true),'')::uuid;
 INSERT INTO stock_movements(organization_id,product_id,lot_id,variant_id,order_id,quantity_delta,reason,occurred_at,created_by)
 VALUES(NEW.organization_id,NEW.product_id,NEW.id,NEW.variant_id,v_order,v_delta,COALESCE(v_reason,CASE WHEN TG_OP='INSERT' THEN 'receipt' ELSE 'adjustment' END),now(),auth.uid());
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.record_stock_movement() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stock_lots_record_movement AFTER INSERT OR UPDATE OF quantity_available ON public.stock_lots FOR EACH ROW EXECUTE FUNCTION public.record_stock_movement();

-- ============================================================
-- 20261029170007_saas_metrics.sql
-- 20261029170008_discovery_100_orders.sql
-- 20261029170009_live_sessions_all_plans.sql
-- ============================================================

-- Server-only aggregate; no billing identities or cross-tenant rows reach tenants.
CREATE FUNCTION public.platform_saas_metrics(p_excluded uuid[] DEFAULT '{}') RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
WITH orgs AS (
 SELECT o.id,o.created_at,
 EXISTS(SELECT 1 FROM products p WHERE p.organization_id=o.id) AND EXISTS(SELECT 1 FROM delivery_drivers d WHERE d.organization_id=o.id) AND EXISTS(SELECT 1 FROM orders c WHERE c.organization_id=o.id) complete,
 (SELECT count(*) FROM orders c WHERE c.organization_id=o.id AND c.created_at<o.created_at+interval '1 day') orders_day1,
 (SELECT count(*) FROM orders c WHERE c.organization_id=o.id AND c.created_at<o.created_at+interval '7 days') orders_day7,
 EXISTS(SELECT 1 FROM orders c WHERE c.organization_id=o.id AND c.created_at>=date_trunc('month',o.created_at)+interval '1 month' AND c.created_at<date_trunc('month',o.created_at)+interval '2 months') retained_m1,
 EXISTS(SELECT 1 FROM orders c WHERE c.organization_id=o.id AND c.created_at>=date_trunc('month',o.created_at)+interval '3 months' AND c.created_at<date_trunc('month',o.created_at)+interval '4 months') retained_m3
 FROM organizations o WHERE o.owner_id IS NOT NULL AND NOT(o.id=ANY(p_excluded))
), paid AS (
 SELECT DISTINCT ON(g.organization_id) g.organization_id,g.plan,i.cycle,i.amount,g.period_end
 FROM subscription_grants g JOIN billing_invoices i ON i.id=g.invoice_id JOIN orgs o ON o.id=g.organization_id
 WHERE i.mode=(SELECT mode FROM billing_settings WHERE singleton) AND i.state='paid' AND g.revoked_at IS NULL AND g.period_start<=now() AND g.period_end>now()
 ORDER BY g.organization_id,CASE g.plan WHEN 'business' THEN 2 ELSE 1 END DESC,g.period_end DESC
), month_start AS (
 SELECT DISTINCT g.organization_id FROM subscription_grants g JOIN billing_invoices i ON i.id=g.invoice_id JOIN orgs o ON o.id=g.organization_id
 WHERE i.mode=(SELECT mode FROM billing_settings WHERE singleton) AND g.period_start<=date_trunc('month',now()) AND g.period_end>date_trunc('month',now()) AND (g.revoked_at IS NULL OR g.revoked_at>date_trunc('month',now()))
)
SELECT jsonb_build_object(
 'mode',(SELECT mode FROM billing_settings WHERE singleton),
 'signups',(SELECT count(*) FROM orgs),
 'onboardingComplete',(SELECT count(*) FROM orgs WHERE complete),
 'day1Eligible',(SELECT count(*) FROM orgs WHERE created_at<=now()-interval '1 day'),
 'day1Activated',(SELECT count(*) FROM orgs WHERE created_at<=now()-interval '1 day' AND orders_day1>=1),
 'day7Eligible',(SELECT count(*) FROM orgs WHERE created_at<=now()-interval '7 days'),
 'day7Activated',(SELECT count(*) FROM orgs WHERE created_at<=now()-interval '7 days' AND orders_day7>=5),
 'retentionM1Eligible',(SELECT count(*) FROM orgs WHERE date_trunc('month',created_at)+interval '2 months'<=now()),
 'retentionM1Active',(SELECT count(*) FROM orgs WHERE date_trunc('month',created_at)+interval '2 months'<=now() AND retained_m1),
 'retentionM3Eligible',(SELECT count(*) FROM orgs WHERE date_trunc('month',created_at)+interval '4 months'<=now()),
 'retentionM3Active',(SELECT count(*) FROM orgs WHERE date_trunc('month',created_at)+interval '4 months'<=now() AND retained_m3),
 'paidOrganizations',(SELECT count(*) FROM paid),
 'mrr',COALESCE((SELECT sum(CASE cycle WHEN 'yearly' THEN amount::numeric/12 ELSE amount END) FROM paid),0),
 'paidAtMonthStart',(SELECT count(*) FROM month_start),
 'paidLostThisMonth',(SELECT count(*) FROM month_start s WHERE NOT EXISTS(SELECT 1 FROM paid p WHERE p.organization_id=s.organization_id)),
 'ordersLast7Days',(SELECT count(*) FROM orders c JOIN orgs o ON o.id=c.organization_id WHERE c.created_at>=now()-interval '7 days'),
 'ordersThisMonth',(SELECT count(*) FROM orders c JOIN orgs o ON o.id=c.organization_id WHERE c.created_at>=date_trunc('month',now())),
 'activeOrganizationsThisMonth',(SELECT count(DISTINCT c.organization_id) FROM orders c JOIN orgs o ON o.id=c.organization_id WHERE c.created_at>=date_trunc('month',now()))
);
$$;
REVOKE ALL ON FUNCTION public.platform_saas_metrics(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.platform_saas_metrics(uuid[]) TO service_role;

-- ============================================================
-- 20261029170008_discovery_100_orders.sql
-- 20261029170009_live_sessions_all_plans.sql
-- ============================================================

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

-- 20261029170009_live_sessions_all_plans.sql
-- Live sessions are included in every plan. Keep tenant, active-session,
-- permissions, order quota and FIFO validations in their existing transactions.
DROP TRIGGER IF EXISTS live_subscription_gate ON public.live_sessions;
DROP FUNCTION IF EXISTS public.guard_live_subscription();

CREATE OR REPLACE FUNCTION public.create_order_complete(p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid:=public.current_org_id();v_id uuid;v_live uuid:=NULLIF(p_data->>'live_session_id','')::uuid;v_status text;
BEGIN
 IF auth.uid() IS NULL OR v_org IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sales_people WHERE id=(p_data->>'seller_id')::uuid AND organization_id=v_org AND is_active) THEN RAISE EXCEPTION 'INVALID_SELLER'; END IF;
 IF v_live IS NOT NULL THEN
   SELECT status INTO v_status FROM public.live_sessions WHERE id=v_live AND organization_id=v_org FOR SHARE;
   IF v_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'LIVE_SESSION_NOT_ACTIVE'; END IF;
 END IF;
 v_id:=public.create_order_with_fifo(p_data->>'client_name',p_data->>'client_phone',p_data->>'channel',(p_data->>'order_date')::date,
   NULLIF(p_data->>'delivery_driver_id','')::uuid,p_data->>'delivery_location',COALESCE((p_data->>'delivery_fee')::numeric,0),
   COALESCE((p_data->>'confirmation_amount')::numeric,0),NULLIF(p_data->>'payment_method',''),p_data->'lines',NULLIF(p_data->>'delivery_date','')::date);
 UPDATE public.orders SET seller_id=(p_data->>'seller_id')::uuid,live_session_id=v_live WHERE id=v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_order_complete(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_order_complete(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_order_live_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_status text;
BEGIN
 IF NEW.live_session_id IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.live_session_id IS NOT DISTINCT FROM OLD.live_session_id THEN RETURN NEW; END IF;
 SELECT status INTO v_status FROM public.live_sessions WHERE id=NEW.live_session_id AND organization_id=NEW.organization_id FOR SHARE;
 IF v_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'LIVE_SESSION_NOT_ACTIVE'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_order_live_assignment() FROM PUBLIC,anon,authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
