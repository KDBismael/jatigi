-- Per-line discounts are calculated in the same transaction as stock allocation.
-- Remember that fulfilment has occurred even if an operator corrects the status.
ALTER TABLE orders ADD COLUMN discounts_locked_at TIMESTAMPTZ;
UPDATE orders SET discounts_locked_at=COALESCE(delivered_at,updated_at,created_at,NOW())
WHERE status IN ('delivered','cancelled');
ALTER TABLE order_lines
  ADD COLUMN line_subtotal NUMERIC(12,2),
  ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none','amount','percent')),
  ADD COLUMN discount_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  ADD COLUMN discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN discount_reason TEXT,
  ADD COLUMN discount_applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN discount_applied_at TIMESTAMPTZ;
UPDATE order_lines SET line_subtotal = line_total;
ALTER TABLE order_lines ALTER COLUMN line_subtotal SET NOT NULL;
ALTER TABLE order_lines ADD CONSTRAINT order_lines_discount_check CHECK (
  line_subtotal >= 0 AND line_total = line_subtotal - discount_amount AND line_total >= 0
  AND ((discount_type = 'none' AND discount_value = 0 AND discount_amount = 0 AND discount_reason IS NULL)
    OR (discount_type <> 'none' AND discount_value > 0 AND char_length(trim(discount_reason)) BETWEEN 1 AND 300
      AND discount_reason IS NOT NULL AND (discount_type <> 'percent' OR discount_value <= 100)))
);

CREATE OR REPLACE FUNCTION calculate_line_discount(p_subtotal NUMERIC,p_type TEXT,p_value NUMERIC,p_reason TEXT)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE v_amount NUMERIC;
BEGIN
  IF p_subtotal IS NULL OR p_subtotal < 0 OR p_type IS NULL OR p_type NOT IN ('none','amount','percent')
    OR p_value IS NULL OR p_value < 0 OR p_value > 9999999999.99 OR p_value <> ROUND(p_value,2)
    OR p_subtotal::text IN ('NaN','Infinity','-Infinity') OR p_value::text IN ('NaN','Infinity','-Infinity')
    THEN RAISE EXCEPTION 'INVALID_DISCOUNT'; END IF;
  IF p_type='none' AND p_value<>0 THEN RAISE EXCEPTION 'INVALID_DISCOUNT'; END IF;
  IF p_type='percent' AND p_value>100 THEN RAISE EXCEPTION 'INVALID_DISCOUNT'; END IF;
  IF p_value>0 AND (p_reason IS NULL OR char_length(trim(p_reason)) NOT BETWEEN 1 AND 300)
    THEN RAISE EXCEPTION 'DISCOUNT_REASON_REQUIRED'; END IF;
  v_amount:=CASE p_type WHEN 'amount' THEN p_value WHEN 'percent' THEN ROUND(p_subtotal*p_value/100,2) ELSE 0 END;
  IF v_amount>p_subtotal THEN RAISE EXCEPTION 'DISCOUNT_EXCEEDS_LINE'; END IF;
  RETURN v_amount;
END $$;
REVOKE ALL ON FUNCTION calculate_line_discount(NUMERIC,TEXT,NUMERIC,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION calculate_line_discount(NUMERIC,TEXT,NUMERIC,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION create_order_with_fifo(
  p_client_name TEXT, p_client_phone TEXT, p_channel TEXT, p_order_date DATE,
  p_delivery_driver_id UUID, p_delivery_location TEXT, p_delivery_fee NUMERIC,
  p_confirmation_amount NUMERIC, p_payment_method TEXT, p_lines JSONB
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
    organization_id,delivery_driver_id,delivery_location,delivery_fee,confirmation_amount,payment_method)
  VALUES (p_client_name,p_client_phone,p_channel,p_order_date,
    CASE WHEN v_confirmation>0 THEN 'confirmed' ELSE 'received' END,
    auth.uid(),v_org,p_delivery_driver_id,p_delivery_location,v_delivery_fee,v_confirmation,
    CASE WHEN v_confirmation>0 THEN p_payment_method ELSE NULL END)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;
REVOKE ALL ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB) TO authenticated;


CREATE OR REPLACE FUNCTION update_order_discounts_safe(p_order_id UUID,p_lines JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_order orders; v_change JSONB; v_line order_lines; v_type TEXT; v_value NUMERIC; v_reason TEXT; v_amount NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR current_org_id() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO v_order FROM orders WHERE id=p_order_id AND organization_id=current_org_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_order.status IN ('delivered','cancelled') OR v_order.discounts_locked_at IS NOT NULL THEN RAISE EXCEPTION 'DISCOUNTS_LOCKED'; END IF;
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_LINES'; END IF;
  IF jsonb_array_length(p_lines) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'INVALID_LINES'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x GROUP BY x->>'id' HAVING COUNT(*)>1)
    THEN RAISE EXCEPTION 'DUPLICATE_LINE'; END IF;
  FOR v_change IN SELECT value FROM jsonb_array_elements(p_lines) ORDER BY value->>'id' LOOP
    SELECT * INTO v_line FROM order_lines WHERE id=(v_change->>'id')::UUID AND order_id=p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'LINE_NOT_FOUND'; END IF;
    v_type:=COALESCE(v_change->>'discount_type','none');
    v_value:=COALESCE((v_change->>'discount_value')::NUMERIC,0);
    v_reason:=NULLIF(trim(v_change->>'discount_reason'),'');
    v_amount:=calculate_line_discount(v_line.line_subtotal,v_type,v_value,v_reason);
    UPDATE order_lines SET line_total=line_subtotal-v_amount,
      discount_type=CASE WHEN v_value=0 THEN 'none' ELSE v_type END,
      discount_value=v_value,discount_amount=v_amount,
      discount_reason=CASE WHEN v_value=0 THEN NULL ELSE v_reason END,
      discount_applied_by=CASE WHEN v_value=0 THEN NULL ELSE auth.uid() END,
      discount_applied_at=CASE WHEN v_value=0 THEN NULL ELSE NOW() END
    WHERE id=v_line.id AND (
      discount_type IS DISTINCT FROM CASE WHEN v_value=0 THEN 'none' ELSE v_type END
      OR discount_value IS DISTINCT FROM v_value
      OR discount_reason IS DISTINCT FROM CASE WHEN v_value=0 THEN NULL ELSE v_reason END
    );
  END LOOP;
  IF (SELECT COALESCE(SUM(line_total),0) FROM order_lines WHERE order_id=p_order_id)+v_order.delivery_fee<v_order.confirmation_amount
    THEN RAISE EXCEPTION 'DEPOSIT_EXCEEDS_TOTAL'; END IF;
  UPDATE orders SET updated_at=NOW() WHERE id=p_order_id;
END $$;
REVOKE ALL ON FUNCTION update_order_discounts_safe(UUID,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION update_order_discounts_safe(UUID,JSONB) TO authenticated;

-- Financial edits serialize on the same order lock as discount/status changes.
CREATE OR REPLACE FUNCTION check_order_deposit_total()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.discounts_locked_at IS NOT NULL THEN
    NEW.discounts_locked_at:=OLD.discounts_locked_at;
  ELSIF NEW.status IN ('delivered','cancelled') THEN
    NEW.discounts_locked_at:=NOW();
  END IF;
  IF (NEW.confirmation_amount IS DISTINCT FROM OLD.confirmation_amount OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee)
    AND EXISTS(SELECT 1 FROM order_lines WHERE order_id=NEW.id)
    AND NEW.confirmation_amount>(SELECT COALESCE(SUM(line_total),0) FROM order_lines WHERE order_id=NEW.id)+NEW.delivery_fee
    THEN RAISE EXCEPTION 'DEPOSIT_EXCEEDS_TOTAL'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION check_order_deposit_total() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER check_order_deposit_total BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION check_order_deposit_total();

GRANT SELECT(unit_price,offer_price,line_total,line_subtotal,discount_type,discount_value,discount_amount,
  discount_reason,discount_applied_by,discount_applied_at) ON order_lines TO authenticated;

ALTER TABLE organizations ADD COLUMN logo_path TEXT;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('organization-logos','organization-logos',true,2097152,ARRAY['image/png','image/jpeg'])
ON CONFLICT(id) DO NOTHING;
-- Public logo reads are intentional. Uploads/deletes go through the admin-only
-- application endpoint and service-role client; no client write policy is added.
