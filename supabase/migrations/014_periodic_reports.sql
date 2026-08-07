-- Unified daily, weekly, monthly, quarterly and yearly business reports.
CREATE TABLE periodic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily','weekly','monthly','quarterly','yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL CHECK (period_end >= period_start),
  snapshot JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  regenerated_at TIMESTAMPTZ,
  regenerated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (organization_id, period_type, period_start, period_end)
);
CREATE INDEX periodic_reports_history_idx ON periodic_reports(organization_id, period_type, period_start DESC);
ALTER TABLE periodic_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see own org periodic reports" ON periodic_reports FOR SELECT USING (
  organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin')
);

INSERT INTO periodic_reports (organization_id,period_type,period_start,period_end,snapshot,generated_at,regenerated_at,regenerated_by)
SELECT organization_id,'monthly',month,(month + INTERVAL '1 month - 1 day')::date,snapshot,generated_at,regenerated_at,regenerated_by
FROM monthly_reports ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION build_period_snapshot(p_org UUID, p_start DATE, p_end DATE)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
WITH delivered AS (
  SELECT ord.id,ord.seller_id,ord.live_session_id,ord.channel,
    SUM(ol.unit_price*ol.quantity) revenue,SUM(ol.unit_cost*ol.quantity) cost
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
    SELECT pr.name,SUM(ol.quantity) quantity,SUM(ol.unit_price*ol.quantity) revenue
    FROM orders ord JOIN order_lines ol ON ol.order_id=ord.id JOIN products pr ON pr.id=ol.product_id
    WHERE ord.organization_id=p_org AND ord.status='delivered' AND (ord.delivered_at AT TIME ZONE 'Africa/Abidjan')::date BETWEEN p_start AND p_end
    GROUP BY pr.id,pr.name ORDER BY SUM(ol.quantity) DESC,pr.name LIMIT 10) x),'[]'::jsonb),
  'sellers',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT pf.full_name name,COUNT(*) orders,SUM(d.revenue) revenue
    FROM delivered d JOIN profiles pf ON pf.id=d.seller_id GROUP BY pf.id,pf.full_name ORDER BY SUM(d.revenue) DESC,pf.full_name) x),'[]'::jsonb),
  'lives',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT COALESCE(ls.name,'Live') name,ls.slot,COUNT(*) orders,SUM(d.revenue) revenue
    FROM delivered d JOIN live_sessions ls ON ls.id=d.live_session_id GROUP BY ls.id,ls.name,ls.slot ORDER BY SUM(d.revenue) DESC) x),'[]'::jsonb),
  'channels',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT d.channel,COUNT(*) orders,SUM(d.revenue) revenue FROM delivered d GROUP BY d.channel ORDER BY SUM(d.revenue) DESC) x),'[]'::jsonb)
) FROM totals t CROSS JOIN exp e;
$$;

CREATE OR REPLACE FUNCTION close_periodic_reports(p_type TEXT,p_start DATE,p_end DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n INTEGER;
BEGIN
  IF p_type NOT IN ('daily','weekly','monthly','quarterly','yearly') OR p_end>=CURRENT_DATE THEN RAISE EXCEPTION 'INVALID_PERIOD'; END IF;
  PERFORM generate_recurring_expenses(date_trunc('month',p_start)::date);
  INSERT INTO periodic_reports(organization_id,period_type,period_start,period_end,snapshot)
    SELECT id,p_type,p_start,p_end,build_period_snapshot(id,p_start,p_end) FROM organizations
    ON CONFLICT(organization_id,period_type,period_start,period_end) DO NOTHING;
  GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;

CREATE OR REPLACE FUNCTION run_periodic_report_closures(p_today DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n INTEGER:=0; q_start DATE; previous DATE:=p_today-1;
BEGIN
  n:=n+close_periodic_reports('daily',previous,previous);
  IF EXTRACT(ISODOW FROM p_today)=1 THEN n:=n+close_periodic_reports('weekly',p_today-7,p_today-1); END IF;
  IF EXTRACT(DAY FROM p_today)=1 THEN
    q_start:=date_trunc('month',p_today-1)::date; n:=n+close_periodic_reports('monthly',q_start,p_today-1);
  END IF;
  IF EXTRACT(DAY FROM p_today)=1 AND EXTRACT(MONTH FROM p_today) IN(1,4,7,10) THEN
    q_start=(date_trunc('quarter',p_today)-INTERVAL '3 months')::date; n:=n+close_periodic_reports('quarterly',q_start,p_today-1);
  END IF;
  IF EXTRACT(MONTH FROM p_today)=1 AND EXTRACT(DAY FROM p_today)=1 THEN
    q_start=make_date(EXTRACT(YEAR FROM p_today)::int-1,1,1); n:=n+close_periodic_reports('yearly',q_start,p_today-1);
  END IF;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION build_period_snapshot(UUID,DATE,DATE) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION close_periodic_reports(TEXT,DATE,DATE) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION run_periodic_report_closures(DATE) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION build_period_snapshot(UUID,DATE,DATE) TO service_role;
GRANT EXECUTE ON FUNCTION close_periodic_reports(TEXT,DATE,DATE) TO service_role;
GRANT EXECUTE ON FUNCTION run_periodic_report_closures(DATE) TO service_role;

DO $$ DECLARE job RECORD; BEGIN
  FOR job IN SELECT jobid FROM cron.job WHERE jobname IN('warko-monthly-close','warko-periodic-reports') LOOP PERFORM cron.unschedule(job.jobid); END LOOP;
END $$;
SELECT cron.schedule('warko-periodic-reports','10 0 * * *','SELECT run_periodic_report_closures();');
