CREATE TABLE public.product_variants(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 stock_quantity integer NOT NULL DEFAULT 0 CHECK(stock_quantity>=0),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(product_id,name), UNIQUE(id,product_id,organization_id)
);
CREATE INDEX product_variants_org_product_idx ON public.product_variants(organization_id,product_id);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_variants FROM anon,authenticated;
GRANT SELECT ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
CREATE POLICY "Read own variants" ON public.product_variants FOR SELECT TO authenticated USING(organization_id=(SELECT current_org_id()) AND EXISTS(SELECT 1 FROM profiles WHERE id=(SELECT auth.uid()) AND role IN ('admin','employee')));
ALTER TABLE public.stock_lots ADD COLUMN variant_id uuid;
ALTER TABLE public.stock_lots ADD CONSTRAINT stock_lots_variant_fkey FOREIGN KEY(variant_id,product_id,organization_id) REFERENCES public.product_variants(id,product_id,organization_id);
CREATE INDEX stock_lots_variant_fifo_idx ON public.stock_lots(product_id,variant_id,received_at,id) WHERE quantity_available>0;
ALTER TABLE public.order_lines ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT, ADD COLUMN variant_name text;
CREATE FUNCTION public.sync_variant_quantity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP<>'INSERT' AND OLD.variant_id IS NOT NULL THEN UPDATE product_variants SET stock_quantity=stock_quantity-OLD.quantity_available WHERE id=OLD.variant_id; END IF;
 IF TG_OP<>'DELETE' AND NEW.variant_id IS NOT NULL THEN UPDATE product_variants SET stock_quantity=stock_quantity+NEW.quantity_available WHERE id=NEW.variant_id; END IF;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_variant_quantity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stock_lots_sync_variant AFTER INSERT OR UPDATE OF quantity_available,variant_id OR DELETE ON public.stock_lots FOR EACH ROW EXECUTE FUNCTION public.sync_variant_quantity();
CREATE OR REPLACE FUNCTION add_stock_lot_safe(
  p_product_id UUID,p_quantity INTEGER,p_total_purchase NUMERIC,p_total_transport NUMERIC,
  p_total_packaging NUMERIC,p_received_at TIMESTAMPTZ,p_variant_id UUID
) RETURNS UUID AS $$
DECLARE v_org UUID:=current_org_id(); v_lot_id UUID; v_sale_price NUMERIC;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND organization_id=v_org)
    THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_quantity<=0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  SELECT sale_price INTO v_sale_price FROM products WHERE id=p_product_id AND organization_id=v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF NOT EXISTS(SELECT 1 FROM product_variants WHERE id=p_variant_id AND product_id=p_product_id AND organization_id=v_org AND is_active=true) THEN RAISE EXCEPTION 'INVALID_PRODUCT_VARIANT'; END IF;
  INSERT INTO stock_lots(product_id,organization_id,variant_id,quantity_received,quantity_available,purchase_cost,
    import_cost,import_cost_type,import_cost_raw,import_batch_size,packaging_cost,unit_cost,sale_price,received_at)
  VALUES(p_product_id,v_org,p_variant_id,p_quantity,p_quantity,p_total_purchase/p_quantity,p_total_transport/p_quantity,'lot',
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
REVOKE ALL ON FUNCTION add_stock_lot_safe(UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ,UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION add_stock_lot_safe(UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ,UUID) TO authenticated;


CREATE OR REPLACE FUNCTION create_order_with_fifo(
  p_client_name TEXT, p_client_phone TEXT, p_channel TEXT, p_order_date DATE,
  p_delivery_driver_id UUID, p_delivery_location TEXT, p_delivery_fee NUMERIC,
  p_confirmation_amount NUMERIC, p_payment_method TEXT, p_lines JSONB, p_delivery_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_org UUID := current_org_id(); v_order_id UUID; v_line JSONB; v_product RECORD;
  v_variant RECORD; v_variant_name TEXT; v_variant_id UUID; v_offer RECORD; v_line_id UUID; v_lot RECORD; v_remaining INTEGER;
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
    v_variant_name:=NULL;
    v_variant_id:=NULLIF(v_line->>'variant_id','')::uuid;
    IF v_variant_id IS NOT NULL THEN
      SELECT id,name INTO v_variant FROM product_variants WHERE id=v_variant_id AND product_id=v_product.id AND organization_id=v_org AND is_active=true;
      IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_PRODUCT_VARIANT'; END IF;
      v_variant_name:=v_variant.name;
    END IF;
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

    UPDATE order_lines SET variant_id=v_variant_id,variant_name=v_variant_name WHERE id=v_line_id;
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
    PERFORM set_config('warko.stock_order',v_order_id::text,true);
    PERFORM set_config('warko.stock_reason','sale',true);
    v_remaining := v_stock_quantity; v_total_cost := 0;
    FOR v_lot IN SELECT * FROM stock_lots WHERE product_id=v_product.id
      AND organization_id=v_org AND variant_id IS NOT DISTINCT FROM v_variant_id AND quantity_available>0 ORDER BY received_at,id FOR UPDATE LOOP
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
  PERFORM set_config('warko.stock_order','',true);
  PERFORM set_config('warko.stock_reason','',true);
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp;
REVOKE ALL ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB,DATE) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION create_order_with_fifo(TEXT,TEXT,TEXT,DATE,UUID,TEXT,NUMERIC,NUMERIC,TEXT,JSONB,DATE) TO authenticated;
