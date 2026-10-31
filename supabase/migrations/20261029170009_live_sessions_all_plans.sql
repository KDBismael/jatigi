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
