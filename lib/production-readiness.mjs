/** Read-only configuration checks. Passing these does not certify a launch. */
export function productionChecks(env, { allowTest = false } = {}) {
  const checks = [];
  const add = (id, ok, message) =>
    checks.push({ id, ok: Boolean(ok), message });
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "NOTIFICATION_FROM_EMAIL",
    "NOTIFICATION_UNSUBSCRIBE_SECRET",
    "CRON_SECRET",
  ]) {
    add(
      name,
      env[name]?.trim(),
      `${name} ${env[name]?.trim() ? "présent" : "manquant"}.`,
    );
  }
  let baseValid = false;
  try {
    const url = new URL(env.APP_BASE_URL);
    baseValid =
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password;
  } catch {}
  add(
    "APP_BASE_URL",
    baseValid,
    "Une origine HTTPS publique sans chemin ni paramètres est nécessaire.",
  );
  const mode = env.MONERIZ_MODE;
  add(
    "MONERIZ_MODE",
    mode === "live" || (allowTest && mode === "test"),
    allowTest
      ? "Le mode doit être test ou live."
      : "Le lancement demande le mode live ; test reste réservé à la recette.",
  );
  if (mode === "test" || mode === "live") {
    const keyName =
      mode === "test" ? "MONERIZ_TEST_SECRET_KEY" : "MONERIZ_LIVE_SECRET_KEY";
    const webhookName =
      mode === "test"
        ? "MONERIZ_TEST_WEBHOOK_SECRET"
        : "MONERIZ_LIVE_WEBHOOK_SECRET";
    add(
      keyName,
      env[keyName]?.startsWith(`izp_${mode}_sk_`),
      `Clé ${mode} cohérente avec le mode.`,
    );
    add(
      webhookName,
      env[webhookName]?.trim(),
      `Secret webhook ${mode} présent.`,
    );
  }
  return checks;
}
export const schemaProbes = [
  [
    "organizations",
    "id,owner_id,country,currency,default_delivery_fee,onboarding_step,onboarding_skipped_steps,logo_path",
  ],
  ["orders", "id,delivery_date,discounts_locked_at"],
  ["order_lines", "id,line_subtotal,discount_type,discount_amount"],
  ["order_delivery_assignments", "id"],
  ["billing_settings", "mode"],
  ["organization_subscriptions", "organization_id"],
  ["billing_invoices", "id"],
  ["billing_payments", "mode,payment_id"],
  ["subscription_grants", "id"],
  ["organization_usage", "organization_id"],
  ["moneriz_events", "id"],
  ["notification_jobs", "id"],
  ["product_variants", "id"],
  ["product_images", "id"],
  ["stock_movements", "id"],
  ["live_sessions", "id,status"],
  [
    "products",
    "id,offers:product_offers(id),variants:product_variants(id),images:product_images(id)",
  ],
];
