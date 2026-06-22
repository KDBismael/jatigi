-- ============================================================
-- Migration 005: prix de vente par lot + moyenne pondérée
-- ============================================================

ALTER TABLE stock_lots
  ADD COLUMN sale_price NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Backfill: initialize each lot's sale_price from the product's current sale_price
UPDATE stock_lots sl
  SET sale_price = p.sale_price
  FROM products p
  WHERE sl.product_id = p.id;
