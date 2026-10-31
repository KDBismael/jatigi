import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  productionChecks,
  schemaProbes,
} from "../lib/production-readiness.mjs";
if (fs.existsSync(".env")) process.loadEnvFile(".env");
const database = process.argv.includes("--database");
const checks = productionChecks(process.env, {
  allowTest: process.argv.includes("--allow-test"),
});
if (database) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    checks.push({
      id: "schema",
      ok: false,
      message: "Accès serveur Supabase absent ; schéma non vérifié.",
    });
  else {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(15000) }),
      },
    });
    for (const [table, columns] of schemaProbes) {
      try {
        const result = await db.from(table).select(columns).limit(0);
        checks.push({
          id: `schema:${table}`,
          ok: !result.error,
          message: result.error
            ? `${result.error.code || "NETWORK"} : ${result.error.message}`
            : "Lecture sans données réussie.",
        });
      } catch {
        checks.push({
          id: `schema:${table}`,
          ok: false,
          message: "Connexion Supabase impossible ; contrôle non effectué.",
        });
      }
    }
    const mode = await db
      .from("billing_settings")
      .select("mode")
      .eq("singleton", true)
      .maybeSingle();
    checks.push({
      id: "billing-mode-match",
      ok: !mode.error && mode.data?.mode === process.env.MONERIZ_MODE,
      message: "Le mode de la base doit correspondre au mode du serveur.",
    });
  }
}
const report = {
  checkedAt: new Date().toISOString(),
  databaseChecked: database,
  configurationChecksPassed: checks.every((c) => c.ok),
  checks,
  remainingManualChecks: [
    "Paiement Moneriz confirmé et webhook de recette",
    "Expéditeur email vérifié et cron opérationnel",
    "Identité légale de l’éditeur et politique Auth Supabase",
    "Parcours métier complet et isolation entre boutiques",
  ],
};
const output = process.argv.find((a) => a.startsWith("--output="))?.slice(9);
if (output) {
  fs.mkdirSync(new URL("../", new URL(output, `file://${process.cwd()}/`)), {
    recursive: true,
  });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.configurationChecksPassed ? 0 : 1;
