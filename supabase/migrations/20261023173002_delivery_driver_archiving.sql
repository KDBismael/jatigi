-- Archive drivers by changing is_active; financial records are never deleted.
REVOKE DELETE ON public.delivery_drivers FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_active_delivery_driver()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE v_active boolean;
BEGIN
  IF NEW.delivery_driver_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.delivery_driver_id IS NOT DISTINCT FROM OLD.delivery_driver_id
      AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id THEN RETURN NEW; END IF;
  END IF;
  -- Conflicts with the row update used by archive/restore, serializing assignments.
  SELECT is_active INTO v_active FROM public.delivery_drivers
    WHERE id = NEW.delivery_driver_id AND organization_id = NEW.organization_id
    FOR SHARE;
  IF v_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'INVALID_DELIVERY_DRIVER'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_active_delivery_driver() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER orders_active_delivery_driver
  BEFORE INSERT OR UPDATE OF delivery_driver_id, organization_id ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_active_delivery_driver();
