-- ============================================================
-- Jatigi — Migration 004: FIFO lot-based stock management
-- ============================================================

-- Stock lots: each replenishment is a separate lot
CREATE TABLE stock_lots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quantity_received  INTEGER NOT NULL CHECK (quantity_received > 0),
  quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
  purchase_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  import_cost      NUMERIC(10,2) NOT NULL DEFAULT 0,   -- per-unit, computed
  import_cost_type TEXT NOT NULL DEFAULT 'unit'
    CHECK (import_cost_type IN ('unit','carton','lot','container')),
  import_cost_raw  NUMERIC(10,2) NOT NULL DEFAULT 0,
  import_batch_size INTEGER,
  packaging_cost   NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_cost        NUMERIC(10,2) NOT NULL DEFAULT 0,   -- purchase+import+packaging
  received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- FIFO allocation audit: which lots were consumed per order line
CREATE TABLE order_line_lots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_line_id    UUID NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
  lot_id           UUID NOT NULL REFERENCES stock_lots(id),
  quantity_allocated INTEGER NOT NULL CHECK (quantity_allocated > 0),
  unit_cost        NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE stock_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org lots"
  ON stock_lots FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "Admins insert own org lots"
  ON stock_lots FOR INSERT WITH CHECK (
    organization_id = current_org_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update own org lots"
  ON stock_lots FOR UPDATE USING (
    organization_id = current_org_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can read order_line_lots"
  ON order_line_lots FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert order_line_lots"
  ON order_line_lots FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- Drop the flat decrement trigger — stock now managed via lots
-- ============================================================
DROP TRIGGER IF EXISTS after_order_line_insert ON order_lines;

-- ============================================================
-- FIFO consumption RPC (atomic, with row-level locking)
-- ============================================================
CREATE OR REPLACE FUNCTION consume_stock_fifo(
  p_order_line_id UUID,
  p_product_id    UUID,
  p_org_id        UUID,
  p_quantity      INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  lot          RECORD;
  remaining    INTEGER := p_quantity;
  total_cost   NUMERIC := 0;
  allocated    INTEGER;
BEGIN
  FOR lot IN
    SELECT * FROM stock_lots
    WHERE product_id = p_product_id
      AND organization_id = p_org_id
      AND quantity_available > 0
    ORDER BY received_at ASC, id ASC
    FOR UPDATE
  LOOP
    EXIT WHEN remaining = 0;

    allocated := LEAST(lot.quantity_available, remaining);

    UPDATE stock_lots
    SET quantity_available = quantity_available - allocated
    WHERE id = lot.id;

    INSERT INTO order_line_lots (order_line_id, lot_id, quantity_allocated, unit_cost)
    VALUES (p_order_line_id, lot.id, allocated, lot.unit_cost);

    total_cost := total_cost + (allocated * lot.unit_cost);
    remaining  := remaining - allocated;
  END LOOP;

  IF remaining > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: besoin de %, disponible %',
      p_quantity, p_quantity - remaining;
  END IF;

  -- Update cached stock on the product
  UPDATE products
  SET stock_quantity = stock_quantity - p_quantity,
      updated_at     = NOW()
  WHERE id = p_product_id;

  RETURN total_cost / p_quantity;  -- weighted unit cost
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Helper: increment product stock safely
-- ============================================================
CREATE OR REPLACE FUNCTION increment_product_stock(
  p_product_id UUID,
  p_quantity   INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity + p_quantity,
      updated_at     = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Backfill: create one initial lot per existing product
-- ============================================================
INSERT INTO stock_lots (
  product_id, organization_id,
  quantity_received, quantity_available,
  purchase_cost, import_cost, import_cost_type, import_cost_raw, import_batch_size,
  packaging_cost, unit_cost,
  received_at
)
SELECT
  id, organization_id,
  GREATEST(stock_quantity, 0), GREATEST(stock_quantity, 0),
  purchase_cost, import_cost, import_cost_type, import_cost_raw, import_batch_size,
  packaging_cost,
  purchase_cost + import_cost + packaging_cost,
  created_at
FROM products
WHERE stock_quantity > 0 AND organization_id IS NOT NULL;
