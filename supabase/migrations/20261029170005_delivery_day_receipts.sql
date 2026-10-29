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
