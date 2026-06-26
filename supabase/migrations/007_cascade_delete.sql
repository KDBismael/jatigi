-- ============================================================
-- Migration 006: suppression en cascade depuis products
-- ============================================================

-- stock_lots → products
ALTER TABLE stock_lots
  DROP CONSTRAINT IF EXISTS stock_lots_product_id_fkey,
  ADD CONSTRAINT stock_lots_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- order_lines → products
ALTER TABLE order_lines
  DROP CONSTRAINT IF EXISTS order_lines_product_id_fkey,
  ADD CONSTRAINT order_lines_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- order_line_lots → stock_lots (colonne: lot_id)
ALTER TABLE order_line_lots
  DROP CONSTRAINT IF EXISTS order_line_lots_lot_id_fkey,
  ADD CONSTRAINT order_line_lots_lot_id_fkey
    FOREIGN KEY (lot_id) REFERENCES stock_lots(id) ON DELETE CASCADE;

-- order_line_lots → order_lines
ALTER TABLE order_line_lots
  DROP CONSTRAINT IF EXISTS order_line_lots_order_line_id_fkey,
  ADD CONSTRAINT order_line_lots_order_line_id_fkey
    FOREIGN KEY (order_line_id) REFERENCES order_lines(id) ON DELETE CASCADE;
