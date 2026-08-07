-- Warko — CEO pilotage: sellers, lives, goals, expenses and monthly snapshots

CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  session_date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('morning','afternoon','evening')),
  target_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (target_amount >= 0),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, organization_id)
);

ALTER TABLE orders ADD COLUMN seller_id UUID REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE orders ADD COLUMN live_session_id UUID REFERENCES live_sessions(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
UPDATE orders SET seller_id = created_by WHERE seller_id IS NULL;
UPDATE orders o SET seller_id = (
  SELECT p.id FROM profiles p WHERE p.organization_id = o.organization_id ORDER BY (p.role = 'admin') DESC, p.created_at LIMIT 1
) WHERE seller_id IS NULL;
UPDATE orders SET delivered_at = COALESCE(updated_at, created_at) WHERE status = 'delivered' AND delivered_at IS NULL;
ALTER TABLE orders ALTER COLUMN seller_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN seller_id SET DEFAULT auth.uid();
ALTER TABLE profiles ADD CONSTRAINT profiles_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE orders DROP CONSTRAINT orders_seller_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id, organization_id) REFERENCES profiles(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE orders DROP CONSTRAINT orders_live_session_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_live_session_id_fkey FOREIGN KEY (live_session_id, organization_id) REFERENCES live_sessions(id, organization_id) ON DELETE NO ACTION;
CREATE INDEX orders_seller_idx ON orders(seller_id);
CREATE INDEX orders_live_session_idx ON orders(live_session_id);
CREATE INDEX orders_delivered_at_idx ON orders(organization_id, delivered_at);

CREATE TABLE monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month DATE NOT NULL CHECK (date_trunc('month', month)::date = month),
  scope TEXT NOT NULL CHECK (scope IN ('global','seller','live')),
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((scope = 'global' AND seller_id IS NULL AND live_session_id IS NULL)
      OR (scope = 'seller' AND seller_id IS NOT NULL AND live_session_id IS NULL)
      OR (scope = 'live' AND seller_id IS NULL AND live_session_id IS NOT NULL))
);
CREATE UNIQUE INDEX monthly_goals_global_unique ON monthly_goals(organization_id, month) WHERE scope = 'global';
CREATE UNIQUE INDEX monthly_goals_seller_unique ON monthly_goals(organization_id, month, seller_id) WHERE scope = 'seller';
CREATE UNIQUE INDEX monthly_goals_live_unique ON monthly_goals(organization_id, month, live_session_id) WHERE scope = 'live';

CREATE TABLE expense_recurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('salary','rent','stock','packaging','internet','electricity','other')),
  label TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  starts_on DATE NOT NULL,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('salary','rent','stock','packaging','internet','electricity','other')),
  label TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  recurrence_id UUID REFERENCES expense_recurrences(id) ON DELETE SET NULL,
  recurrence_month DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX expenses_recurrence_month_unique ON expenses(recurrence_id, recurrence_month) WHERE recurrence_id IS NOT NULL;
CREATE INDEX expenses_org_date_idx ON expenses(organization_id, expense_date);

CREATE TABLE monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month DATE NOT NULL CHECK (date_trunc('month', month)::date = month),
  snapshot JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  regenerated_at TIMESTAMPTZ,
  regenerated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (organization_id, month)
);

ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org lives" ON live_sessions FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Admins manage own org lives" ON live_sessions FOR ALL USING (organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins manage own org goals" ON monthly_goals FOR ALL USING (organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins manage own org recurrences" ON expense_recurrences FOR ALL USING (organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins manage own org expenses" ON expenses FOR ALL USING (organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins see own org reports" ON monthly_reports FOR SELECT USING (organization_id = current_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Generate missing monthly expense occurrences. Safe to call repeatedly.
CREATE OR REPLACE FUNCTION generate_recurring_expenses(p_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::date)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE inserted_count INTEGER;
BEGIN
  INSERT INTO expenses (organization_id, category, label, amount, expense_date, recurrence_id, recurrence_month)
  SELECT r.organization_id, r.category, r.label, r.amount,
    p_month + (r.day_of_month - 1), r.id, p_month
  FROM expense_recurrences r
  WHERE r.is_active AND r.starts_on <= (p_month + INTERVAL '1 month - 1 day')::date
    AND (r.ends_on IS NULL OR r.ends_on >= p_month)
  ON CONFLICT (recurrence_id, recurrence_month) WHERE recurrence_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END $$;

-- Snapshot closed-month financials. Detail rankings are completed by the application exporter.
CREATE OR REPLACE FUNCTION close_monthly_reports(p_month DATE DEFAULT (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE inserted_count INTEGER;
BEGIN
  PERFORM generate_recurring_expenses(p_month);
  INSERT INTO monthly_reports (organization_id, month, snapshot)
  SELECT org.id, p_month, jsonb_build_object(
    'revenue', COALESCE(o.revenue, 0), 'costOfGoods', COALESCE(o.cost, 0),
    'stockPurchases', COALESCE(e.stock, 0), 'fixedExpenses', COALESCE(e.fixed, 0),
    'otherExpenses', COALESCE(e.other, 0), 'expenses', COALESCE(e.operating, 0),
    'estimatedProfit', COALESCE(o.revenue, 0) - COALESCE(o.cost, 0) - COALESCE(e.operating, 0),
    'orders', COALESCE(o.orders, 0),
    'averageBasket', CASE WHEN COALESCE(o.orders, 0) = 0 THEN 0 ELSE o.revenue / o.orders END,
    'topProducts', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM (
      SELECT pr.name, SUM(ol.quantity) quantity, SUM(ol.unit_price * ol.quantity) revenue
      FROM orders ord JOIN order_lines ol ON ol.order_id=ord.id JOIN products pr ON pr.id=ol.product_id
      WHERE ord.organization_id=org.id AND ord.status='delivered' AND ord.delivered_at>=p_month AND ord.delivered_at<p_month+INTERVAL '1 month'
      GROUP BY pr.id,pr.name ORDER BY SUM(ol.quantity) DESC LIMIT 10
    ) p), '[]'::jsonb),
    'sellers', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM (
      SELECT pf.full_name name, COUNT(DISTINCT ord.id) orders, SUM(ol.unit_price*ol.quantity) revenue
      FROM orders ord JOIN order_lines ol ON ol.order_id=ord.id JOIN profiles pf ON pf.id=ord.seller_id
      WHERE ord.organization_id=org.id AND ord.status='delivered' AND ord.delivered_at>=p_month AND ord.delivered_at<p_month+INTERVAL '1 month'
      GROUP BY pf.id,pf.full_name ORDER BY SUM(ol.unit_price*ol.quantity) DESC
    ) s), '[]'::jsonb),
    'lives', COALESCE((SELECT jsonb_agg(to_jsonb(l)) FROM (
      SELECT COALESCE(ls.name,'Live') name, ls.slot, COUNT(DISTINCT ord.id) orders, SUM(ol.unit_price*ol.quantity) revenue
      FROM orders ord JOIN order_lines ol ON ol.order_id=ord.id JOIN live_sessions ls ON ls.id=ord.live_session_id
      WHERE ord.organization_id=org.id AND ord.status='delivered' AND ord.delivered_at>=p_month AND ord.delivered_at<p_month+INTERVAL '1 month'
      GROUP BY ls.id,ls.name,ls.slot ORDER BY SUM(ol.unit_price*ol.quantity) DESC
    ) l), '[]'::jsonb),
    'channels', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM (
      SELECT ord.channel, COUNT(DISTINCT ord.id) orders, SUM(ol.unit_price*ol.quantity) revenue
      FROM orders ord JOIN order_lines ol ON ol.order_id=ord.id
      WHERE ord.organization_id=org.id AND ord.status='delivered' AND ord.delivered_at>=p_month AND ord.delivered_at<p_month+INTERVAL '1 month'
      GROUP BY ord.channel ORDER BY SUM(ol.unit_price*ol.quantity) DESC
    ) c), '[]'::jsonb)
  )
  FROM organizations org
  LEFT JOIN LATERAL (
    SELECT COUNT(*) orders, SUM(x.revenue) revenue, SUM(x.cost) cost FROM (
      SELECT ord.id, SUM(ol.unit_price * ol.quantity) revenue, SUM(ol.unit_cost * ol.quantity) cost
      FROM orders ord JOIN order_lines ol ON ol.order_id = ord.id
      WHERE ord.organization_id = org.id AND ord.status = 'delivered'
        AND ord.delivered_at >= p_month AND ord.delivered_at < p_month + INTERVAL '1 month'
      GROUP BY ord.id
    ) x
  ) o ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(amount) FILTER (WHERE category <> 'stock') operating,
      SUM(amount) FILTER (WHERE category = 'stock') stock,
      SUM(amount) FILTER (WHERE category IN ('salary','rent','internet','electricity')) fixed,
      SUM(amount) FILTER (WHERE category NOT IN ('stock','salary','rent','internet','electricity')) other
    FROM expenses WHERE organization_id = org.id AND expense_date >= p_month AND expense_date < p_month + INTERVAL '1 month'
  ) e ON TRUE
  ON CONFLICT (organization_id, month) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END $$;

REVOKE ALL ON FUNCTION generate_recurring_expenses(DATE) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION close_monthly_reports(DATE) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION generate_recurring_expenses(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION close_monthly_reports(DATE) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('warko-monthly-close', '5 0 1 * *', 'SELECT close_monthly_reports();');
