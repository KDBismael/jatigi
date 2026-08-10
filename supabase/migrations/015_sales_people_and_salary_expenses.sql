-- ============================================================
-- Jatigi/Warko — Migration 015: sales people + salary expenses
-- ============================================================

CREATE TABLE sales_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) > 0),
  phone TEXT,
  person_type TEXT NOT NULL DEFAULT 'internal' CHECK (person_type IN ('account','internal','external')),
  base_salary NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  salary_mode TEXT NOT NULL DEFAULT 'manual' CHECK (salary_mode IN ('manual','automatic')),
  hired_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, organization_id),
  UNIQUE (profile_id),
  CHECK (ended_on IS NULL OR ended_on >= hired_on)
);

INSERT INTO sales_people (
  id, organization_id, profile_id, full_name, phone, person_type,
  base_salary, salary_mode, hired_on, is_active, created_at, updated_at
)
SELECT
  p.id, p.organization_id, p.id, p.full_name, p.phone, 'account',
  0, 'manual', p.created_at::date, TRUE, p.created_at, COALESCE(p.created_at, NOW())
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

CREATE TABLE sales_person_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sales_person_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note TEXT,
  evaluated_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (sales_person_id, organization_id)
    REFERENCES sales_people(id, organization_id) ON DELETE CASCADE
);

ALTER TABLE expenses ADD COLUMN sales_person_id UUID;
ALTER TABLE expense_recurrences ADD COLUMN sales_person_id UUID;

ALTER TABLE expenses ADD CONSTRAINT expenses_sales_person_fkey
  FOREIGN KEY (sales_person_id, organization_id)
  REFERENCES sales_people(id, organization_id) ON DELETE NO ACTION;

ALTER TABLE expense_recurrences ADD CONSTRAINT expense_recurrences_sales_person_fkey
  FOREIGN KEY (sales_person_id, organization_id)
  REFERENCES sales_people(id, organization_id) ON DELETE NO ACTION;

CREATE UNIQUE INDEX expense_recurrences_salary_person_unique
  ON expense_recurrences(organization_id, sales_person_id)
  WHERE sales_person_id IS NOT NULL AND category = 'salary';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_seller_id_fkey
  FOREIGN KEY (seller_id, organization_id)
  REFERENCES sales_people(id, organization_id) ON DELETE RESTRICT;

ALTER TABLE monthly_goals DROP CONSTRAINT IF EXISTS monthly_goals_seller_id_fkey;
ALTER TABLE monthly_goals ADD CONSTRAINT monthly_goals_seller_id_fkey
  FOREIGN KEY (seller_id, organization_id)
  REFERENCES sales_people(id, organization_id) ON DELETE CASCADE;

CREATE INDEX sales_people_org_idx ON sales_people(organization_id);
CREATE INDEX sales_people_active_idx ON sales_people(organization_id, is_active, full_name);
CREATE INDEX sales_people_profile_idx ON sales_people(profile_id);
CREATE INDEX sales_person_evaluations_person_idx ON sales_person_evaluations(sales_person_id, evaluated_on DESC);
CREATE INDEX expenses_sales_person_idx ON expenses(sales_person_id);

ALTER TABLE sales_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_person_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org sales people" ON sales_people
  FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "Admins manage own org sales people" ON sales_people
  FOR ALL USING (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins see own org sales evaluations" ON sales_person_evaluations
  FOR SELECT USING (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins manage own org sales evaluations" ON sales_person_evaluations
  FOR ALL USING (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    organization_id = current_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TRIGGER set_sales_people_updated_at
  BEFORE UPDATE ON sales_people
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sync account-backed sales people when a profile name/phone changes.
CREATE OR REPLACE FUNCTION sync_sales_person_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sales_people SET
    full_name = NEW.full_name,
    phone = NEW.phone
  WHERE profile_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_sales_person_from_profile_trigger
  AFTER UPDATE OF full_name, phone ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_sales_person_from_profile();

-- Generate recurring expenses, but only keep salary recurrences active while
-- the linked sales person is active for the requested month.
CREATE OR REPLACE FUNCTION generate_recurring_expenses(p_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::date)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted_count INTEGER;
BEGIN
  INSERT INTO expenses (
    organization_id, category, label, amount, expense_date,
    recurrence_id, recurrence_month, sales_person_id
  )
  SELECT
    r.organization_id, r.category, r.label, r.amount,
    p_month + (r.day_of_month - 1), r.id, p_month, r.sales_person_id
  FROM expense_recurrences r
  LEFT JOIN sales_people sp
    ON sp.id = r.sales_person_id AND sp.organization_id = r.organization_id
  WHERE r.is_active
    AND r.starts_on <= (p_month + INTERVAL '1 month - 1 day')::date
    AND (r.ends_on IS NULL OR r.ends_on >= p_month)
    AND (
      r.sales_person_id IS NULL
      OR (
        sp.id IS NOT NULL
        AND sp.is_active
        AND sp.salary_mode = 'automatic'
        AND sp.hired_on <= (p_month + INTERVAL '1 month - 1 day')::date
        AND (sp.ended_on IS NULL OR sp.ended_on >= p_month)
      )
    )
  ON CONFLICT (recurrence_id, recurrence_month) WHERE recurrence_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END $$;

-- Period reports now rank sales_people, including internal sellers without accounts.
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
    SELECT sp.full_name name,COUNT(*) orders,SUM(d.revenue) revenue
    FROM delivered d JOIN sales_people sp ON sp.id=d.seller_id
    GROUP BY sp.id,sp.full_name ORDER BY SUM(d.revenue) DESC,sp.full_name) x),'[]'::jsonb),
  'lives',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT COALESCE(ls.name,'Live') name,ls.slot,COUNT(*) orders,SUM(d.revenue) revenue
    FROM delivered d JOIN live_sessions ls ON ls.id=d.live_session_id GROUP BY ls.id,ls.name,ls.slot ORDER BY SUM(d.revenue) DESC) x),'[]'::jsonb),
  'channels',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT d.channel,COUNT(*) orders,SUM(d.revenue) revenue FROM delivered d GROUP BY d.channel ORDER BY SUM(d.revenue) DESC) x),'[]'::jsonb)
) FROM totals t CROSS JOIN exp e;
$$;

REVOKE ALL ON FUNCTION generate_recurring_expenses(DATE) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION generate_recurring_expenses(DATE) TO service_role;
REVOKE ALL ON FUNCTION build_period_snapshot(UUID,DATE,DATE) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION build_period_snapshot(UUID,DATE,DATE) TO service_role;
