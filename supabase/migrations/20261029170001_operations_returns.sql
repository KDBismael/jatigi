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
