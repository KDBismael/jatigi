-- ============================================================
-- Add import cost batch tracking to products
-- ============================================================

ALTER TABLE products
  ADD COLUMN import_cost_type TEXT NOT NULL DEFAULT 'unit'
    CHECK (import_cost_type IN ('unit', 'carton', 'lot', 'container')),
  ADD COLUMN import_cost_raw  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN import_batch_size INTEGER;

-- Backfill: existing rows were entered as per-unit costs
UPDATE products
  SET import_cost_raw = import_cost,
      import_cost_type = 'unit';
