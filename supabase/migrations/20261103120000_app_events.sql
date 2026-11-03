BEGIN;
-- First-party product analytics. Written and read by the server only (service_role).
CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (name ~ '^[a-z_]{2,48}$'),
  anonymous_id uuid NOT NULL,
  user_id uuid,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  path text CHECK (length(path) <= 200),
  props jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(props) = 'object' AND pg_column_size(props) <= 2048)
);
CREATE INDEX IF NOT EXISTS app_events_created_idx ON public.app_events(created_at);
CREATE INDEX IF NOT EXISTS app_events_name_created_idx ON public.app_events(name, created_at);
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_events TO service_role;

-- Funnel for a period: visits come from events, signups/activation/payment from real rows.
CREATE OR REPLACE FUNCTION public.platform_event_report(p_from date, p_to date, p_excluded uuid[] DEFAULT '{}')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
WITH bounds AS (SELECT p_from::timestamptz AS lo, (p_to + 1)::timestamptz AS hi),
ev AS (
  SELECT e.* FROM app_events e, bounds b
  WHERE e.created_at >= b.lo AND e.created_at < b.hi
    AND (e.organization_id IS NULL OR NOT (e.organization_id = ANY(p_excluded)))
),
cohort AS (
  SELECT o.id, o.created_at FROM organizations o, bounds b
  WHERE o.owner_id IS NOT NULL AND NOT (o.id = ANY(p_excluded)) AND o.created_at >= b.lo AND o.created_at < b.hi
),
visits AS (
  SELECT anonymous_id, (created_at AT TIME ZONE 'Africa/Abidjan')::date AS day, COALESCE(NULLIF(props->>'source', ''), 'direct') AS source
  FROM ev WHERE name = 'landing_view'
)
SELECT jsonb_build_object(
  'funnel', jsonb_build_object(
    'visitors', (SELECT count(DISTINCT anonymous_id) FROM visits),
    'signupClicks', (SELECT count(DISTINCT anonymous_id) FROM ev WHERE name = 'cta_signup'),
    'signupViews', (SELECT count(DISTINCT anonymous_id) FROM ev WHERE name = 'signup_view'),
    'signups', (SELECT count(*) FROM cohort),
    'onboarded', (SELECT count(*) FROM cohort c WHERE EXISTS (SELECT 1 FROM products p WHERE p.organization_id = c.id)
      AND EXISTS (SELECT 1 FROM delivery_drivers d WHERE d.organization_id = c.id) AND EXISTS (SELECT 1 FROM orders x WHERE x.organization_id = c.id)),
    'firstOrder', (SELECT count(*) FROM cohort c WHERE EXISTS (SELECT 1 FROM orders x WHERE x.organization_id = c.id)),
    'paid', (SELECT count(*) FROM cohort c WHERE EXISTS (SELECT 1 FROM billing_invoices i WHERE i.organization_id = c.id AND i.state = 'paid'
      AND i.mode = (SELECT mode FROM billing_settings WHERE singleton)))
  ),
  'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'day', to_char(d, 'YYYY-MM-DD'),
      'visitors', (SELECT count(DISTINCT anonymous_id) FROM visits v WHERE v.day = d::date),
      'signups', (SELECT count(*) FROM cohort c WHERE (c.created_at AT TIME ZONE 'Africa/Abidjan')::date = d::date)
    ) ORDER BY d), '[]'::jsonb) FROM generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d),
  'sources', (SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'visitors', n) ORDER BY n DESC, source), '[]'::jsonb)
    FROM (SELECT source, count(DISTINCT anonymous_id) n FROM visits GROUP BY source ORDER BY n DESC, source LIMIT 8) s),
  'actions', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'events', n, 'shops', shops) ORDER BY n DESC, name), '[]'::jsonb)
    FROM (SELECT name, count(*) n, count(DISTINCT organization_id) shops FROM ev WHERE organization_id IS NOT NULL GROUP BY name) a)
);
$$;
REVOKE ALL ON FUNCTION public.platform_event_report(date, date, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_event_report(date, date, uuid[]) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
