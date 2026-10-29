-- Server-only aggregate; no billing identities or cross-tenant rows reach tenants.
CREATE FUNCTION public.platform_saas_metrics(p_excluded uuid[] DEFAULT '{}') RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
WITH orgs AS (
 SELECT o.id,o.created_at,
 EXISTS(SELECT 1 FROM products p WHERE p.organization_id=o.id) AND EXISTS(SELECT 1 FROM delivery_drivers d WHERE d.organization_id=o.id) AND EXISTS(SELECT 1 FROM orders c WHERE c.organization_id=o.id) complete,
 (SELECT count(*) FROM orders c WHERE c.organization_id=o.id AND c.created_at<o.created_at+interval '1 day') orders_day1,
 (SELECT count(*) FROM orders c WHERE c.organization_id=o.id AND c.created_at<o.created_at+interval '7 days') orders_day7,
 EXISTS(SELECT 1 FROM orders c WHERE c.organization_id=o.id AND c.created_at>=date_trunc('month',o.created_at)+interval '1 month' AND c.created_at<date_trunc('month',o.created_at)+interval '2 months') retained_m1,
 EXISTS(SELECT 1 FROM orders c WHERE c.organization_id=o.id AND c.created_at>=date_trunc('month',o.created_at)+interval '3 months' AND c.created_at<date_trunc('month',o.created_at)+interval '4 months') retained_m3
 FROM organizations o WHERE o.owner_id IS NOT NULL AND NOT(o.id=ANY(p_excluded))
), paid AS (
 SELECT DISTINCT ON(g.organization_id) g.organization_id,g.plan,i.cycle,i.amount,g.period_end
 FROM subscription_grants g JOIN billing_invoices i ON i.id=g.invoice_id JOIN orgs o ON o.id=g.organization_id
 WHERE i.mode=(SELECT mode FROM billing_settings WHERE singleton) AND i.state='paid' AND g.revoked_at IS NULL AND g.period_start<=now() AND g.period_end>now()
 ORDER BY g.organization_id,CASE g.plan WHEN 'business' THEN 2 ELSE 1 END DESC,g.period_end DESC
), month_start AS (
 SELECT DISTINCT g.organization_id FROM subscription_grants g JOIN billing_invoices i ON i.id=g.invoice_id JOIN orgs o ON o.id=g.organization_id
 WHERE i.mode=(SELECT mode FROM billing_settings WHERE singleton) AND g.period_start<=date_trunc('month',now()) AND g.period_end>date_trunc('month',now()) AND (g.revoked_at IS NULL OR g.revoked_at>date_trunc('month',now()))
)
SELECT jsonb_build_object(
 'mode',(SELECT mode FROM billing_settings WHERE singleton),
 'signups',(SELECT count(*) FROM orgs),
 'onboardingComplete',(SELECT count(*) FROM orgs WHERE complete),
 'day1Eligible',(SELECT count(*) FROM orgs WHERE created_at<=now()-interval '1 day'),
 'day1Activated',(SELECT count(*) FROM orgs WHERE created_at<=now()-interval '1 day' AND orders_day1>=1),
 'day7Eligible',(SELECT count(*) FROM orgs WHERE created_at<=now()-interval '7 days'),
 'day7Activated',(SELECT count(*) FROM orgs WHERE created_at<=now()-interval '7 days' AND orders_day7>=5),
 'retentionM1Eligible',(SELECT count(*) FROM orgs WHERE date_trunc('month',created_at)+interval '2 months'<=now()),
 'retentionM1Active',(SELECT count(*) FROM orgs WHERE date_trunc('month',created_at)+interval '2 months'<=now() AND retained_m1),
 'retentionM3Eligible',(SELECT count(*) FROM orgs WHERE date_trunc('month',created_at)+interval '4 months'<=now()),
 'retentionM3Active',(SELECT count(*) FROM orgs WHERE date_trunc('month',created_at)+interval '4 months'<=now() AND retained_m3),
 'paidOrganizations',(SELECT count(*) FROM paid),
 'mrr',COALESCE((SELECT sum(CASE cycle WHEN 'yearly' THEN amount::numeric/12 ELSE amount END) FROM paid),0),
 'paidAtMonthStart',(SELECT count(*) FROM month_start),
 'paidLostThisMonth',(SELECT count(*) FROM month_start s WHERE NOT EXISTS(SELECT 1 FROM paid p WHERE p.organization_id=s.organization_id)),
 'ordersLast7Days',(SELECT count(*) FROM orders c JOIN orgs o ON o.id=c.organization_id WHERE c.created_at>=now()-interval '7 days'),
 'ordersThisMonth',(SELECT count(*) FROM orders c JOIN orgs o ON o.id=c.organization_id WHERE c.created_at>=date_trunc('month',now())),
 'activeOrganizationsThisMonth',(SELECT count(DISTINCT c.organization_id) FROM orders c JOIN orgs o ON o.id=c.organization_id WHERE c.created_at>=date_trunc('month',now()))
);
$$;
REVOKE ALL ON FUNCTION public.platform_saas_metrics(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.platform_saas_metrics(uuid[]) TO service_role;
