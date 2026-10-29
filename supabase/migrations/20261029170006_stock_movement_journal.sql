CREATE TABLE public.stock_movements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
 lot_id uuid NOT NULL REFERENCES public.stock_lots(id) ON DELETE RESTRICT,
 variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
 order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
 quantity_delta integer NOT NULL CHECK(quantity_delta<>0),
 reason text NOT NULL CHECK(reason IN ('receipt','sale','return','adjustment')),
 occurred_at timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 reconstructed boolean NOT NULL DEFAULT false
);
CREATE INDEX stock_movements_product_time_idx ON public.stock_movements(organization_id,product_id,recorded_at DESC,id);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stock_movements FROM anon,authenticated;
GRANT ALL ON public.stock_movements TO service_role;
-- Reconstruct only facts evidenced by original lots and durable FIFO allocations.
-- Old adjustments cannot be recovered. Return dates were never recorded, so remain NULL.
INSERT INTO public.stock_movements(organization_id,product_id,lot_id,variant_id,quantity_delta,reason,occurred_at,reconstructed)
 SELECT organization_id,product_id,id,variant_id,quantity_received,'receipt',received_at,true FROM stock_lots WHERE quantity_received>0;
INSERT INTO public.stock_movements(organization_id,product_id,lot_id,variant_id,order_id,quantity_delta,reason,occurred_at,created_by,reconstructed)
 SELECT o.organization_id,ol.product_id,a.lot_id,ol.variant_id,o.id,-a.quantity_allocated,'sale',o.created_at,o.created_by,true
 FROM order_line_lots a JOIN order_lines ol ON ol.id=a.order_line_id JOIN orders o ON o.id=ol.order_id;
INSERT INTO public.stock_movements(organization_id,product_id,lot_id,variant_id,order_id,quantity_delta,reason,occurred_at,reconstructed)
 SELECT o.organization_id,ol.product_id,a.lot_id,ol.variant_id,o.id,a.quantity_allocated,'return',NULL,true
 FROM order_line_lots a JOIN order_lines ol ON ol.id=a.order_line_id JOIN orders o ON o.id=ol.order_id WHERE o.status IN ('cancelled','returned');
CREATE FUNCTION public.record_stock_movement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_delta integer; v_reason text; v_order uuid;
BEGIN
 v_delta:=NEW.quantity_available-CASE WHEN TG_OP='INSERT' THEN 0 ELSE OLD.quantity_available END;
 IF v_delta=0 THEN RETURN NULL; END IF;
 v_reason:=NULLIF(current_setting('warko.stock_reason',true),'');
 v_order:=NULLIF(current_setting('warko.stock_order',true),'')::uuid;
 INSERT INTO stock_movements(organization_id,product_id,lot_id,variant_id,order_id,quantity_delta,reason,occurred_at,created_by)
 VALUES(NEW.organization_id,NEW.product_id,NEW.id,NEW.variant_id,v_order,v_delta,COALESCE(v_reason,CASE WHEN TG_OP='INSERT' THEN 'receipt' ELSE 'adjustment' END),now(),auth.uid());
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.record_stock_movement() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stock_lots_record_movement AFTER INSERT OR UPDATE OF quantity_available ON public.stock_lots FOR EACH ROW EXECUTE FUNCTION public.record_stock_movement();
