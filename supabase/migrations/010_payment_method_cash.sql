-- ============================================================
-- Jatigi/Warko — Migration 010: add 'cash' (espèce) payment method
-- ============================================================
-- Widens the orders.payment_method CHECK constraint to accept 'cash' so a
-- confirmation deposit can be recorded as paid in cash (espèce) alongside the
-- existing mobile-money options.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('wave','orange_money','mtn_momo','moov_money','cash'));
