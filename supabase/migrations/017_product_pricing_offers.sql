-- ============================================================
-- Warko — Migration 017: unit pricing + configurable offers
-- ============================================================

ALTER TABLE products
  ADD COLUMN pricing_mode TEXT NOT NULL DEFAULT 'unit'
    CHECK (pricing_mode IN ('unit','offers','both'));

ALTER TABLE products
  ADD CONSTRAINT products_unit_price_for_mode_check
  CHECK (pricing_mode = 'offers' OR sale_price > 0);

CREATE TABLE product_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  units_per_offer INTEGER NOT NULL CHECK (units_per_offer > 0),
  price NUMERIC(12,2) NOT NULL CHECK (price > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX product_offers_product_idx ON product_offers(product_id, is_active);
CREATE INDEX product_offers_org_idx ON product_offers(organization_id);
ALTER TABLE product_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own org product offers" ON product_offers FOR SELECT
  USING (organization_id = current_org_id());
CREATE POLICY "Admins manage own org product offers" ON product_offers FOR ALL
  USING (organization_id = current_org_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (organization_id = current_org_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE TRIGGER set_product_offers_updated_at BEFORE UPDATE ON product_offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE order_lines
  ALTER COLUMN unit_price DROP NOT NULL,
  ADD COLUMN pricing_type TEXT NOT NULL DEFAULT 'unit'
    CHECK (pricing_type IN ('unit','offer')),
  ADD COLUMN product_offer_id UUID REFERENCES product_offers(id) ON DELETE SET NULL,
  ADD COLUMN offer_name TEXT,
  ADD COLUMN units_per_offer INTEGER,
  ADD COLUMN offer_count INTEGER,
  ADD COLUMN offer_price NUMERIC(12,2),
  ADD COLUMN line_total NUMERIC(12,2),
  ADD COLUMN total_cost NUMERIC(12,2);

UPDATE order_lines SET
  line_total = unit_price * quantity,
  total_cost = unit_cost * quantity;

ALTER TABLE order_lines
  ALTER COLUMN line_total SET NOT NULL,
  ALTER COLUMN total_cost SET NOT NULL,
  ADD CONSTRAINT order_lines_offer_snapshot_check CHECK (
    (pricing_type = 'unit' AND unit_price IS NOT NULL AND product_offer_id IS NULL
      AND offer_name IS NULL AND units_per_offer IS NULL AND offer_count IS NULL AND offer_price IS NULL)
    OR
    (pricing_type = 'offer' AND offer_name IS NOT NULL AND units_per_offer > 0
      AND offer_count > 0 AND offer_price > 0)
  );

-- Sale prices belong to the product/offers, never to an acquisition lot.
DROP FUNCTION IF EXISTS create_product_with_initial_lot(TEXT,NUMERIC,INTEGER,NUMERIC,NUMERIC,NUMERIC);
CREATE OR REPLACE FUNCTION create_product_with_initial_lot(
  p_name TEXT,p_sale_price NUMERIC,p_pricing_mode TEXT,p_stock_quantity INTEGER,
  p_total_purchase NUMERIC,p_total_transport NUMERIC,p_total_packaging NUMERIC
) RETURNS UUID AS $$
DECLARE v_org UUID:=current_org_id(); v_product_id UUID; v_qty INTEGER:=p_stock_quantity;
  v_divisor INTEGER:=GREATEST(p_stock_quantity,1);
BEGIN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND organization_id=v_org)
    THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_pricing_mode NOT IN('unit','offers','both') THEN RAISE EXCEPTION 'INVALID_PRICING_MODE'; END IF;
  IF p_pricing_mode<>'offers' AND p_sale_price<=0 THEN RAISE EXCEPTION 'UNIT_PRICE_REQUIRED'; END IF;
  INSERT INTO products(name,sale_price,pricing_mode,stock_quantity,purchase_cost,import_cost,import_cost_type,
    import_cost_raw,import_batch_size,packaging_cost,organization_id)
  VALUES(p_name,p_sale_price,p_pricing_mode,v_qty,p_total_purchase/v_divisor,p_total_transport/v_divisor,'lot',
    p_total_transport,NULLIF(v_qty,0),p_total_packaging/v_divisor,v_org) RETURNING id INTO v_product_id;
  IF v_qty>0 THEN
    INSERT INTO stock_lots(product_id,organization_id,quantity_received,quantity_available,purchase_cost,
      import_cost,import_cost_type,import_cost_raw,import_batch_size,packaging_cost,unit_cost,sale_price)
    VALUES(v_product_id,v_org,v_qty,v_qty,p_total_purchase/v_qty,p_total_transport/v_qty,'lot',p_total_transport,
      v_qty,p_total_packaging/v_qty,(p_total_purchase+p_total_transport+p_total_packaging)/v_qty,p_sale_price);
  END IF;
  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;
REVOKE ALL ON FUNCTION create_product_with_initial_lot(TEXT,NUMERIC,TEXT,INTEGER,NUMERIC,NUMERIC,NUMERIC) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION create_product_with_initial_lot(TEXT,NUMERIC,TEXT,INTEGER,NUMERIC,NUMERIC,NUMERIC) TO authenticated;

DROP FUNCTION IF EXISTS add_stock_lot_safe(UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION add_stock_lot_safe(
  p_product_id UUID,p_quantity INTEGER,p_total_purchase NUMERIC,p_total_transport NUMERIC,
  p_total_packaging NUMERIC,p_received_at TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE v_org UUID:=current_org_id(); v_lot_id UUID; v_sale_price NUMERIC;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND organization_id=v_org)
    THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_quantity<=0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  SELECT sale_price INTO v_sale_price FROM products WHERE id=p_product_id AND organization_id=v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  INSERT INTO stock_lots(product_id,organization_id,quantity_received,quantity_available,purchase_cost,
    import_cost,import_cost_type,import_cost_raw,import_batch_size,packaging_cost,unit_cost,sale_price,received_at)
  VALUES(p_product_id,v_org,p_quantity,p_quantity,p_total_purchase/p_quantity,p_total_transport/p_quantity,'lot',
    p_total_transport,p_quantity,p_total_packaging/p_quantity,
    (p_total_purchase+p_total_transport+p_total_packaging)/p_quantity,v_sale_price,COALESCE(p_received_at,NOW()))
  RETURNING id INTO v_lot_id;
  UPDATE products SET stock_quantity=stock_quantity+p_quantity,purchase_cost=p_total_purchase/p_quantity,
    import_cost=p_total_transport/p_quantity,import_cost_type='lot',import_cost_raw=p_total_transport,
    import_batch_size=p_quantity,packaging_cost=p_total_packaging/p_quantity
  WHERE id=p_product_id AND organization_id=v_org;
  RETURN v_lot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;
REVOKE ALL ON FUNCTION add_stock_lot_safe(UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION add_stock_lot_safe(UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ) TO authenticated;

DROP FUNCTION IF EXISTS update_stock_lot_safe(UUID,UUID,NUMERIC,INTEGER,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION update_stock_lot_safe(
  p_lot_id UUID,p_product_id UUID,p_quantity_available INTEGER,p_total_purchase NUMERIC,
  p_total_transport NUMERIC,p_total_packaging NUMERIC,p_received_at TIMESTAMPTZ
) RETURNS stock_lots AS $$
DECLARE v_org UUID:=current_org_id(); v_lot stock_lots; v_qty INTEGER;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND organization_id=v_org)
    THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_lot FROM stock_lots WHERE id=p_lot_id AND product_id=p_product_id
    AND organization_id=v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LOT_NOT_FOUND'; END IF;
  v_qty:=v_lot.quantity_received;
  IF p_quantity_available IS NOT NULL AND (p_quantity_available<0 OR p_quantity_available>v_qty)
    THEN RAISE EXCEPTION 'INVALID_AVAILABLE_QUANTITY'; END IF;
  UPDATE stock_lots SET quantity_available=COALESCE(p_quantity_available,quantity_available),
    purchase_cost=COALESCE(p_total_purchase/v_qty,purchase_cost),
    import_cost=COALESCE(p_total_transport/v_qty,import_cost),
    import_cost_raw=COALESCE(p_total_transport,import_cost_raw),
    packaging_cost=COALESCE(p_total_packaging/v_qty,packaging_cost),
    unit_cost=COALESCE(p_total_purchase,purchase_cost*v_qty)/v_qty
      +COALESCE(p_total_transport,import_cost*v_qty)/v_qty
      +COALESCE(p_total_packaging,packaging_cost*v_qty)/v_qty,
    received_at=COALESCE(p_received_at,received_at)
  WHERE id=p_lot_id RETURNING * INTO v_lot;
  UPDATE products SET stock_quantity=(SELECT COALESCE(SUM(quantity_available),0) FROM stock_lots
    WHERE product_id=p_product_id AND organization_id=v_org)
  WHERE id=p_product_id AND organization_id=v_org;
  RETURN v_lot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;
REVOKE ALL ON FUNCTION update_stock_lot_safe(UUID,UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION update_stock_lot_safe(UUID,UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ) TO authenticated;

-- Recreate the transactional order function. Client payloads contain only IDs
-- and counts; every price and stock quantity is resolved and snapshotted here.
DROP FUNCTION IF EXISTS create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB);
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
  v_requested_count INTEGER; v_stock_quantity INTEGER; v_line_total NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF jsonb_array_length(p_lines) = 0 THEN RAISE EXCEPTION 'EMPTY_ORDER'; END IF;
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
        product_offer_id,offer_name,units_per_offer,offer_count,offer_price,line_total,total_cost)
      VALUES (v_order_id,v_product.id,v_stock_quantity,NULL,0,'offer',v_offer.id,v_offer.name,
        v_offer.units_per_offer,v_requested_count,v_offer.price,v_line_total,0)
      RETURNING id INTO v_line_id;
    ELSIF v_pricing_type = 'unit' THEN
      IF v_product.pricing_mode NOT IN ('unit','both') THEN RAISE EXCEPTION 'UNIT_SALES_NOT_ALLOWED'; END IF;
      v_requested_count := (v_line->>'quantity')::INTEGER;
      IF v_requested_count <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      v_stock_quantity := v_requested_count;
      v_line_total := v_product.sale_price * v_requested_count;
      INSERT INTO order_lines (order_id,product_id,quantity,unit_price,unit_cost,pricing_type,line_total,total_cost)
      VALUES (v_order_id,v_product.id,v_stock_quantity,v_product.sale_price,0,'unit',v_line_total,0)
      RETURNING id INTO v_line_id;
    ELSE RAISE EXCEPTION 'INVALID_PRICING_TYPE';
    END IF;

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
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;
REVOKE ALL ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB) TO authenticated;

-- All financial reporting now uses exact line snapshots. Existing lines were
-- backfilled above, so historical regeneration remains numerically identical.
CREATE OR REPLACE FUNCTION build_period_snapshot(p_org UUID,p_start DATE,p_end DATE)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
WITH delivered AS (
  SELECT ord.id,ord.seller_id,ord.live_session_id,ord.channel,
    SUM(ol.line_total) revenue,SUM(ol.total_cost) cost
  FROM orders ord JOIN order_lines ol ON ol.order_id=ord.id
  WHERE ord.organization_id=p_org AND ord.status='delivered'
    AND (ord.delivered_at AT TIME ZONE 'Africa/Abidjan')::date BETWEEN p_start AND p_end
  GROUP BY ord.id
), totals AS (
  SELECT COUNT(*) delivered_orders,COALESCE(SUM(revenue),0) revenue,COALESCE(SUM(cost),0) cost FROM delivered
), exp AS (
  SELECT COALESCE(SUM(amount) FILTER(WHERE category<>'stock'),0) operating,
    COALESCE(SUM(amount) FILTER(WHERE category='stock'),0) stock,
    COALESCE(SUM(amount) FILTER(WHERE category IN('salary','rent','internet','electricity')),0) fixed,
    COALESCE(SUM(amount) FILTER(WHERE category NOT IN('stock','salary','rent','internet','electricity')),0) other
  FROM expenses WHERE organization_id=p_org AND expense_date BETWEEN p_start AND p_end
)
SELECT jsonb_build_object(
  'revenue',t.revenue,'costOfGoods',t.cost,'stockPurchases',e.stock,'fixedExpenses',e.fixed,
  'otherExpenses',e.other,'expenses',e.operating,'estimatedProfit',t.revenue-t.cost-e.operating,
  'orders',(SELECT COUNT(*) FROM orders WHERE organization_id=p_org AND order_date BETWEEN p_start AND p_end),
  'deliveredOrders',t.delivered_orders,
  'cancelledOrders',(SELECT COUNT(*) FROM orders WHERE organization_id=p_org AND status='cancelled' AND order_date BETWEEN p_start AND p_end),
  'averageBasket',CASE WHEN t.delivered_orders=0 THEN 0 ELSE t.revenue/t.delivered_orders END,
  'topProducts',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT pr.name,SUM(ol.quantity) quantity,SUM(ol.line_total) revenue
    FROM orders ord JOIN order_lines ol ON ol.order_id=ord.id JOIN products pr ON pr.id=ol.product_id
    WHERE ord.organization_id=p_org AND ord.status='delivered' AND (ord.delivered_at AT TIME ZONE 'Africa/Abidjan')::date BETWEEN p_start AND p_end
    GROUP BY pr.id,pr.name ORDER BY SUM(ol.quantity) DESC,pr.name LIMIT 10) x),'[]'::jsonb),
  'sellers',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT sp.full_name name,COUNT(*) orders,SUM(d.revenue) revenue FROM delivered d
    JOIN sales_people sp ON sp.id=d.seller_id GROUP BY sp.id,sp.full_name ORDER BY SUM(d.revenue) DESC,sp.full_name) x),'[]'::jsonb),
  'lives',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT COALESCE(ls.name,'Live') name,ls.slot,COUNT(*) orders,SUM(d.revenue) revenue FROM delivered d
    JOIN live_sessions ls ON ls.id=d.live_session_id GROUP BY ls.id,ls.name,ls.slot ORDER BY SUM(d.revenue) DESC) x),'[]'::jsonb),
  'channels',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT d.channel,COUNT(*) orders,SUM(d.revenue) revenue FROM delivered d GROUP BY d.channel ORDER BY SUM(d.revenue) DESC) x),'[]'::jsonb)
) FROM totals t CROSS JOIN exp e;
$$;
REVOKE ALL ON FUNCTION build_period_snapshot(UUID,DATE,DATE) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION build_period_snapshot(UUID,DATE,DATE) TO service_role;

-- Employee-safe reads include selling configuration, never cost columns.
REVOKE ALL ON products FROM authenticated;
GRANT SELECT (id,name,sale_price,pricing_mode,stock_quantity,organization_id,is_active,created_at,updated_at)
  ON products TO authenticated;
GRANT SELECT (id,product_id,name,units_per_offer,price,is_active,organization_id,created_at,updated_at)
  ON product_offers TO authenticated;
REVOKE SELECT ON order_lines FROM authenticated;
GRANT SELECT (id,order_id,product_id,quantity,pricing_type,product_offer_id,offer_name,
  units_per_offer,offer_count,offer_price,line_total) ON order_lines TO authenticated;

DROP VIEW IF EXISTS products_public;
CREATE VIEW products_public WITH (security_invoker=true) AS
  SELECT id,name,sale_price,pricing_mode,stock_quantity,organization_id,is_active,created_at
  FROM products WHERE organization_id=current_org_id();
GRANT SELECT ON products_public TO authenticated;
