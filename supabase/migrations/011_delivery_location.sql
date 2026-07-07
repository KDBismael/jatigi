-- ============================================================
-- Jatigi/Warko — Migration 011: delivery location (lieu de livraison)
-- ============================================================
-- Adds an optional free-text delivery location to orders and threads it through
-- create_order_with_fifo so it is stored atomically at order creation.

ALTER TABLE orders ADD COLUMN delivery_location TEXT;

-- Recreate create_order_with_fifo with one extra param: p_delivery_location.
DROP FUNCTION IF EXISTS create_order_with_fifo(TEXT, TEXT, TEXT, DATE, UUID, NUMERIC, TEXT, JSONB);

CREATE OR REPLACE FUNCTION create_order_with_fifo(
  p_client_name TEXT,
  p_client_phone TEXT,
  p_channel TEXT,
  p_order_date DATE,
  p_delivery_driver_id UUID,
  p_delivery_location TEXT,
  p_confirmation_amount NUMERIC,
  p_payment_method TEXT,
  p_lines JSONB
) RETURNS UUID AS $$
DECLARE
  v_org UUID := current_org_id();
  v_order_id UUID;
  v_line JSONB;
  v_product RECORD;
  v_line_id UUID;
  v_lot RECORD;
  v_remaining INTEGER;
  v_allocated INTEGER;
  v_total_cost NUMERIC;
  v_confirmation NUMERIC := COALESCE(p_confirmation_amount, 0);
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF jsonb_array_length(p_lines) = 0 THEN RAISE EXCEPTION 'EMPTY_ORDER'; END IF;
  IF p_delivery_driver_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM delivery_drivers WHERE id = p_delivery_driver_id AND organization_id = v_org
  ) THEN RAISE EXCEPTION 'INVALID_DELIVERY_DRIVER'; END IF;

  INSERT INTO orders (
    client_name, client_phone, channel, order_date, status, created_by,
    organization_id, delivery_driver_id, delivery_location, confirmation_amount, payment_method
  )
  VALUES (
    p_client_name, p_client_phone, p_channel, p_order_date,
    CASE WHEN v_confirmation > 0 THEN 'confirmed' ELSE 'received' END,
    auth.uid(), v_org, p_delivery_driver_id, p_delivery_location, v_confirmation,
    CASE WHEN v_confirmation > 0 THEN p_payment_method ELSE NULL END
  )
  RETURNING id INTO v_order_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT id, sale_price INTO v_product
    FROM products
    WHERE id = (v_line->>'product_id')::UUID AND organization_id = v_org;
    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;

    v_remaining := (v_line->>'quantity')::INTEGER;
    IF v_remaining <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;

    INSERT INTO order_lines (order_id, product_id, quantity, unit_price, unit_cost)
    VALUES (v_order_id, v_product.id, v_remaining, v_product.sale_price, 0)
    RETURNING id INTO v_line_id;

    v_total_cost := 0;
    FOR v_lot IN
      SELECT * FROM stock_lots
      WHERE product_id = v_product.id AND organization_id = v_org AND quantity_available > 0
      ORDER BY received_at, id FOR UPDATE
    LOOP
      EXIT WHEN v_remaining = 0;
      v_allocated := LEAST(v_lot.quantity_available, v_remaining);
      UPDATE stock_lots SET quantity_available = quantity_available - v_allocated WHERE id = v_lot.id;
      INSERT INTO order_line_lots (order_line_id, lot_id, quantity_allocated, unit_cost)
      VALUES (v_line_id, v_lot.id, v_allocated, v_lot.unit_cost);
      v_total_cost := v_total_cost + v_allocated * v_lot.unit_cost;
      v_remaining := v_remaining - v_allocated;
    END LOOP;

    IF v_remaining > 0 THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
    UPDATE order_lines
      SET unit_cost = v_total_cost / (v_line->>'quantity')::INTEGER
      WHERE id = v_line_id;
    UPDATE products
      SET stock_quantity = stock_quantity - (v_line->>'quantity')::INTEGER
      WHERE id = v_product.id;
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION create_order_with_fifo(TEXT, TEXT, TEXT, DATE, UUID, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_order_with_fifo(TEXT, TEXT, TEXT, DATE, UUID, TEXT, NUMERIC, TEXT, JSONB) TO authenticated;
