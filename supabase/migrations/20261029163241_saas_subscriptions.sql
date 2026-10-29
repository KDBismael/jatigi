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
