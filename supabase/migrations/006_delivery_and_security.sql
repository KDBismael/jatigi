-- ============================================================
-- Jatigi — Migration 006: delivery operations + security hardening
-- ============================================================

CREATE TABLE delivery_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders
  ADD COLUMN delivery_driver_id UUID REFERENCES delivery_drivers(id) ON DELETE SET NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_channel_check;
ALTER TABLE orders ADD CONSTRAINT orders_channel_check
  CHECK (channel IN ('tiktok','facebook','instagram','whatsapp','magasin','other'));

CREATE TABLE delivery_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_driver_id UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  settled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX delivery_drivers_org_idx ON delivery_drivers(organization_id);
CREATE INDEX orders_delivery_driver_idx ON orders(delivery_driver_id);
CREATE INDEX delivery_settlements_driver_idx ON delivery_settlements(delivery_driver_id);

ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org drivers" ON delivery_drivers
  FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Admins manage own org drivers" ON delivery_drivers
  FOR ALL USING (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins see own org settlements" ON delivery_settlements
  FOR SELECT USING (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins manage own org settlements" ON delivery_settlements
  FOR ALL USING (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TRIGGER set_delivery_drivers_updated_at
  BEFORE UPDATE ON delivery_drivers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Replace policies that were authenticated-only rather than tenant-scoped.
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins insert own org profiles" ON profiles FOR INSERT WITH CHECK (
  organization_id = current_org_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update own org profiles" ON profiles FOR UPDATE
  USING (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (organization_id = current_org_id());

DROP POLICY IF EXISTS "Authenticated users can read order lines" ON order_lines;
DROP POLICY IF EXISTS "Authenticated users can insert order lines" ON order_lines;
CREATE POLICY "Users see own org order lines" ON order_lines FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_lines.order_id
      AND orders.organization_id = current_org_id()
  )
);
CREATE POLICY "Users insert own org order lines" ON order_lines FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_lines.order_id
      AND orders.organization_id = current_org_id()
  )
);

DROP POLICY IF EXISTS "Authenticated users can read order_line_lots" ON order_line_lots;
DROP POLICY IF EXISTS "Authenticated users can insert order_line_lots" ON order_line_lots;
CREATE POLICY "Users see own org line lots" ON order_line_lots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM order_lines ol
    JOIN orders o ON o.id = ol.order_id
    WHERE ol.id = order_line_lots.order_line_id
      AND o.organization_id = current_org_id()
  )
);

-- Do not expose cost columns through direct authenticated PostgREST queries.
REVOKE ALL ON products FROM authenticated;
GRANT SELECT (id, name, sale_price, stock_quantity, organization_id, created_at, updated_at)
  ON products TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON order_lines FROM authenticated;
REVOKE SELECT ON order_lines FROM authenticated;
GRANT SELECT (id, order_id, product_id, quantity) ON order_lines TO authenticated;
REVOKE ALL ON order_line_lots FROM authenticated;
REVOKE ALL ON delivery_settlements FROM authenticated;

DROP VIEW IF EXISTS products_public;
CREATE VIEW products_public WITH (security_invoker = true) AS
  SELECT id, name, sale_price, stock_quantity, organization_id, created_at
  FROM products
  WHERE organization_id = current_org_id();
GRANT SELECT ON products_public TO authenticated;

DROP POLICY IF EXISTS "Service role can insert organizations" ON organizations;
CREATE POLICY "Service role can insert organizations" ON organizations
  FOR INSERT TO service_role WITH CHECK (true);

-- Legacy RPCs bypassed RLS. Keep them private; application code uses the checked
-- transactional functions below.
REVOKE ALL ON FUNCTION consume_stock_fifo(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION increment_product_stock(UUID, INTEGER) FROM PUBLIC, anon, authenticated;

-- Create an order and allocate every line in one database transaction.
CREATE OR REPLACE FUNCTION create_order_with_fifo(
  p_client_name TEXT,
  p_client_phone TEXT,
  p_channel TEXT,
  p_order_date DATE,
  p_delivery_driver_id UUID,
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
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF jsonb_array_length(p_lines) = 0 THEN RAISE EXCEPTION 'EMPTY_ORDER'; END IF;
  IF p_delivery_driver_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM delivery_drivers WHERE id = p_delivery_driver_id AND organization_id = v_org
  ) THEN RAISE EXCEPTION 'INVALID_DELIVERY_DRIVER'; END IF;

  INSERT INTO orders (client_name, client_phone, channel, order_date, status, created_by, organization_id, delivery_driver_id)
  VALUES (p_client_name, p_client_phone, p_channel, p_order_date, 'received', auth.uid(), v_org, p_delivery_driver_id)
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
REVOKE ALL ON FUNCTION create_order_with_fifo(TEXT, TEXT, TEXT, DATE, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_order_with_fifo(TEXT, TEXT, TEXT, DATE, UUID, JSONB) TO authenticated;

-- Cancelling restores allocated lots exactly once. A cancelled order is final.
CREATE OR REPLACE FUNCTION update_order_status_safe(p_order_id UUID, p_status TEXT)
RETURNS VOID AS $$
DECLARE
  v_org UUID := current_org_id();
  v_current TEXT;
  v_alloc RECORD;
BEGIN
  IF p_status NOT IN ('received','in_progress','delivered','cancelled') THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION update_order_status_safe(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_order_status_safe(UUID, TEXT) TO authenticated;

-- Recalculate cached product stock from all lots after an administrator edits one.
CREATE OR REPLACE FUNCTION update_stock_lot_safe(
  p_lot_id UUID, p_product_id UUID, p_sale_price NUMERIC,
  p_quantity_available INTEGER, p_total_purchase NUMERIC,
  p_total_transport NUMERIC, p_total_packaging NUMERIC, p_received_at TIMESTAMPTZ
) RETURNS stock_lots AS $$
DECLARE
  v_org UUID := current_org_id();
  v_lot stock_lots;
  v_qty INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND organization_id = v_org)
    THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_lot FROM stock_lots
    WHERE id = p_lot_id AND product_id = p_product_id AND organization_id = v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LOT_NOT_FOUND'; END IF;
  v_qty := v_lot.quantity_received;
  IF p_quantity_available IS NOT NULL AND p_quantity_available > v_qty THEN
    RAISE EXCEPTION 'AVAILABLE_EXCEEDS_RECEIVED';
  END IF;

  UPDATE stock_lots SET
    sale_price = COALESCE(p_sale_price, sale_price),
    quantity_available = COALESCE(p_quantity_available, quantity_available),
    purchase_cost = COALESCE(p_total_purchase / v_qty, purchase_cost),
    import_cost = COALESCE(p_total_transport / v_qty, import_cost),
    import_cost_raw = COALESCE(p_total_transport, import_cost_raw),
    packaging_cost = COALESCE(p_total_packaging / v_qty, packaging_cost),
    unit_cost = COALESCE(p_total_purchase, purchase_cost * v_qty) / v_qty
      + COALESCE(p_total_transport, import_cost * v_qty) / v_qty
      + COALESCE(p_total_packaging, packaging_cost * v_qty) / v_qty,
    received_at = COALESCE(p_received_at, received_at)
  WHERE id = p_lot_id RETURNING * INTO v_lot;

  UPDATE products SET stock_quantity = (
    SELECT COALESCE(SUM(quantity_available), 0) FROM stock_lots
    WHERE product_id = p_product_id AND organization_id = v_org
  ) WHERE id = p_product_id AND organization_id = v_org;
  RETURN v_lot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION update_stock_lot_safe(UUID, UUID, NUMERIC, INTEGER, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_stock_lot_safe(UUID, UUID, NUMERIC, INTEGER, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ) TO authenticated;

REVOKE ALL ON stock_lots FROM authenticated;

CREATE OR REPLACE FUNCTION create_product_with_initial_lot(
  p_name TEXT, p_sale_price NUMERIC, p_stock_quantity INTEGER,
  p_total_purchase NUMERIC, p_total_transport NUMERIC, p_total_packaging NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_org UUID := current_org_id();
  v_product_id UUID;
  v_qty INTEGER := p_stock_quantity;
  v_divisor INTEGER := GREATEST(p_stock_quantity, 1);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND organization_id = v_org)
    THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  INSERT INTO products (
    name, sale_price, stock_quantity, purchase_cost, import_cost, import_cost_type,
    import_cost_raw, import_batch_size, packaging_cost, organization_id
  ) VALUES (
    p_name, p_sale_price, v_qty, p_total_purchase / v_divisor, p_total_transport / v_divisor, 'lot',
    p_total_transport, NULLIF(v_qty, 0), p_total_packaging / v_divisor, v_org
  ) RETURNING id INTO v_product_id;

  IF v_qty > 0 THEN
    INSERT INTO stock_lots (
      product_id, organization_id, quantity_received, quantity_available,
      purchase_cost, import_cost, import_cost_type, import_cost_raw, import_batch_size,
      packaging_cost, unit_cost, sale_price
    ) VALUES (
      v_product_id, v_org, v_qty, v_qty,
      p_total_purchase / v_qty, p_total_transport / v_qty, 'lot', p_total_transport, v_qty,
      p_total_packaging / v_qty, (p_total_purchase + p_total_transport + p_total_packaging) / v_qty,
      p_sale_price
    );
  END IF;
  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION create_product_with_initial_lot(TEXT, NUMERIC, INTEGER, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_product_with_initial_lot(TEXT, NUMERIC, INTEGER, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

CREATE OR REPLACE FUNCTION add_stock_lot_safe(
  p_product_id UUID, p_quantity INTEGER, p_total_purchase NUMERIC,
  p_total_transport NUMERIC, p_total_packaging NUMERIC,
  p_sale_price NUMERIC, p_received_at TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_org UUID := current_org_id();
  v_lot_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND organization_id = v_org)
    THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND organization_id = v_org)
    THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  INSERT INTO stock_lots (
    product_id, organization_id, quantity_received, quantity_available,
    purchase_cost, import_cost, import_cost_type, import_cost_raw, import_batch_size,
    packaging_cost, unit_cost, sale_price, received_at
  ) VALUES (
    p_product_id, v_org, p_quantity, p_quantity,
    p_total_purchase / p_quantity, p_total_transport / p_quantity, 'lot', p_total_transport, p_quantity,
    p_total_packaging / p_quantity, (p_total_purchase + p_total_transport + p_total_packaging) / p_quantity,
    p_sale_price, COALESCE(p_received_at, NOW())
  ) RETURNING id INTO v_lot_id;
  UPDATE products SET
    stock_quantity = stock_quantity + p_quantity,
    purchase_cost = p_total_purchase / p_quantity,
    import_cost = p_total_transport / p_quantity,
    import_cost_type = 'lot', import_cost_raw = p_total_transport, import_batch_size = p_quantity,
    packaging_cost = p_total_packaging / p_quantity
  WHERE id = p_product_id AND organization_id = v_org;
  RETURN v_lot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION add_stock_lot_safe(UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_stock_lot_safe(UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ) TO authenticated;

-- Repair products created after migration 004 by the former non-transactional flow.
INSERT INTO stock_lots (
  product_id, organization_id, quantity_received, quantity_available,
  purchase_cost, import_cost, import_cost_type, import_cost_raw, import_batch_size,
  packaging_cost, unit_cost, sale_price, received_at
)
SELECT
  p.id, p.organization_id, p.stock_quantity, p.stock_quantity,
  p.purchase_cost, p.import_cost, p.import_cost_type, p.import_cost_raw, p.import_batch_size,
  p.packaging_cost, p.purchase_cost + p.import_cost + p.packaging_cost, p.sale_price, p.created_at
FROM products p
WHERE p.stock_quantity > 0
  AND p.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM stock_lots sl WHERE sl.product_id = p.id);

UPDATE products p SET stock_quantity = totals.quantity_available
FROM (
  SELECT product_id, COALESCE(SUM(quantity_available), 0)::INTEGER AS quantity_available
  FROM stock_lots GROUP BY product_id
) totals
WHERE p.id = totals.product_id;
