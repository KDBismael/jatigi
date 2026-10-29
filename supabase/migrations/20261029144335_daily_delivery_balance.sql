ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','employee','manager'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('received','confirmed','in_progress','delivered','cancelled','postponed'));
-- Deliberately no backfill: creation date is not evidence of the actual handover day.
ALTER TABLE public.orders ADD COLUMN delivery_date date;

CREATE TABLE public.order_delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.delivery_drivers(id) ON DELETE RESTRICT,
  assignment_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('in_progress','delivered','cancelled','postponed')),
  remittable_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (remittable_amount >= 0),
  UNIQUE(order_id, driver_id, assignment_date)
);
CREATE INDEX order_delivery_assignments_day_idx ON public.order_delivery_assignments(organization_id,assignment_date,driver_id);
ALTER TABLE public.order_delivery_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_delivery_assignments FROM anon, authenticated;
GRANT SELECT ON public.order_delivery_assignments TO authenticated;
GRANT ALL ON public.order_delivery_assignments TO service_role;
CREATE POLICY "Delivery managers read own daily assignments" ON public.order_delivery_assignments
  FOR SELECT TO authenticated USING (
    organization_id = (SELECT public.current_org_id())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role IN ('admin','manager'))
  );

CREATE OR REPLACE FUNCTION public.prepare_delivery_day() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE v_active boolean;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF (OLD.status IN ('delivered','cancelled') OR OLD.discounts_locked_at IS NOT NULL)
      AND ((OLD.delivery_date IS NOT NULL AND NEW.delivery_date IS DISTINCT FROM OLD.delivery_date) OR NEW.delivery_driver_id IS DISTINCT FROM OLD.delivery_driver_id)
      THEN RAISE EXCEPTION 'DELIVERY_ASSIGNMENT_LOCKED'; END IF;
  END IF;
  IF NEW.delivery_driver_id IS NULL THEN NEW.delivery_date:=NULL; RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    NEW.delivery_date:=COALESCE(NEW.delivery_date,(now() AT TIME ZONE 'Africa/Abidjan')::date);
  ELSE
    IF NEW.delivery_driver_id IS DISTINCT FROM OLD.delivery_driver_id THEN
      NEW.delivery_date:=COALESCE(NEW.delivery_date,(now() AT TIME ZONE 'Africa/Abidjan')::date);
    END IF;
    IF NEW.delivery_date IS DISTINCT FROM OLD.delivery_date THEN
      IF NEW.delivery_date IS NULL THEN RAISE EXCEPTION 'DELIVERY_DATE_REQUIRED'; END IF;
      -- Starting another day is another handover, including when the driver is unchanged.
      IF NOT (OLD.delivery_date IS NULL AND OLD.status IN ('delivered','cancelled') AND NEW.delivery_driver_id=OLD.delivery_driver_id) THEN
        SELECT is_active INTO v_active FROM public.delivery_drivers
          WHERE id=NEW.delivery_driver_id AND organization_id=NEW.organization_id FOR SHARE;
        IF v_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'INVALID_DELIVERY_DRIVER'; END IF;
      END IF;
    END IF;
    IF OLD.status='postponed' AND NEW.status='postponed' AND (NEW.delivery_date IS DISTINCT FROM OLD.delivery_date OR NEW.delivery_driver_id IS DISTINCT FROM OLD.delivery_driver_id) THEN NEW.status:='in_progress'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_delivery_day() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER orders_prepare_delivery_day BEFORE INSERT OR UPDATE OF delivery_driver_id,delivery_date ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.prepare_delivery_day();

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
      CASE WHEN NEW.status IN ('received','confirmed') THEN 'in_progress' ELSE NEW.status END,v_amount)
    ON CONFLICT(order_id,driver_id,assignment_date) DO UPDATE SET driver_id=excluded.driver_id,status=excluded.status,remittable_amount=excluded.remittable_amount;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_delivery_day() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER orders_record_delivery_day AFTER INSERT OR UPDATE OF delivery_driver_id,delivery_date,status,confirmation_amount ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.record_delivery_day();

CREATE OR REPLACE FUNCTION public.refresh_delivery_day_amount() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order uuid;
BEGIN
  v_order:=CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END;
  UPDATE public.order_delivery_assignments a
    SET remittable_amount=GREATEST(0,(SELECT COALESCE(SUM(l.line_total),0) FROM public.order_lines l WHERE l.order_id=v_order)-o.confirmation_amount)
    FROM public.orders o WHERE o.id=v_order AND a.order_id=o.id AND a.driver_id=o.delivery_driver_id AND a.assignment_date=o.delivery_date;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_delivery_day_amount() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER order_lines_refresh_delivery_day AFTER INSERT OR UPDATE OF line_total OR DELETE ON public.order_lines
  FOR EACH ROW EXECUTE FUNCTION public.refresh_delivery_day_amount();

-- Replace the public RPC once, retaining positional compatibility through the optional last argument.
DROP FUNCTION public.create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB);
CREATE OR REPLACE FUNCTION create_order_with_fifo(
  p_client_name TEXT, p_client_phone TEXT, p_channel TEXT, p_order_date DATE,
  p_delivery_driver_id UUID, p_delivery_location TEXT, p_delivery_fee NUMERIC,
  p_confirmation_amount NUMERIC, p_payment_method TEXT, p_lines JSONB, p_delivery_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_org UUID := current_org_id(); v_order_id UUID; v_line JSONB; v_product RECORD;
  v_offer RECORD; v_line_id UUID; v_lot RECORD; v_remaining INTEGER;
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
    v_remaining := v_stock_quantity; v_total_cost := 0;
    FOR v_lot IN SELECT * FROM stock_lots WHERE product_id=v_product.id
      AND organization_id=v_org AND quantity_available>0 ORDER BY received_at,id FOR UPDATE LOOP
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
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp;
REVOKE ALL ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB,DATE) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB,DATE) TO authenticated;

-- A report retains its FIFO allocations. Only cancellation restores stock.
CREATE OR REPLACE FUNCTION update_order_status_safe(p_order_id UUID, p_status TEXT)
RETURNS VOID AS $$
DECLARE
  v_org UUID := current_org_id();
  v_current TEXT;
  v_alloc RECORD;
BEGIN
  IF p_status NOT IN ('received','confirmed','in_progress','delivered','cancelled','postponed') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;
  SELECT status INTO v_current FROM orders
    WHERE id = p_order_id AND organization_id = v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_current = 'cancelled' AND p_status <> 'cancelled' THEN RAISE EXCEPTION 'CANCELLED_ORDER_IS_FINAL'; END IF;

  IF p_status = 'cancelled' AND v_current <> 'cancelled' THEN
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
  UPDATE orders SET status = p_status WHERE id = p_order_id AND organization_id = v_org;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp;
REVOKE ALL ON FUNCTION update_order_status_safe(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_order_status_safe(UUID, TEXT) TO authenticated;
