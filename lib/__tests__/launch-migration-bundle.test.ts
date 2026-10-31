import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { expect, it } from "vitest";
it.each([false, true])(
  "applies the launch bundle atomically (archive already applied: %s) and refuses replay",
  async (archived) => {
    const bundle = await readFile(
      "docs/deployment/2026-10-30-launch-migrations.sql",
      "utf8",
    );
    const db = new PGlite();
    try {
      await db.exec(
        `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT 'authenticated'::text$$;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE SCHEMA cron;CREATE TABLE cron.job(jobid bigint,jobname text);CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated,anon,service_role;`,
      );
      const files = (await readdir("supabase/migrations"))
        .filter(
          (f) =>
            f.endsWith(".sql") &&
            f < "20261023173002_delivery_driver_archiving.sql",
        )
        .sort();
      for (const file of files)
        await db.exec(
          (await readFile("supabase/migrations/" + file, "utf8")).replace(
            "CREATE EXTENSION IF NOT EXISTS pg_cron;",
            "",
          ),
        );
      if (archived)
        await db.exec(
          await readFile(
            "supabase/migrations/20261023173002_delivery_driver_archiving.sql",
            "utf8",
          ),
        );
      await db.exec(
        "INSERT INTO organizations(id,name) VALUES('10000000-0000-4000-8000-000000000001','Boutique avant lancement')",
      );
      await db.exec(bundle);
      expect(
        (await db.query<{ mode: string }>("SELECT mode FROM billing_settings"))
          .rows[0].mode,
      ).toBe("test");
      expect(
        (
          await db.query<{ name: string }>(
            "SELECT name FROM organizations WHERE id='10000000-0000-4000-8000-000000000001'",
          )
        ).rows[0].name,
      ).toBe("Boutique avant lancement");
      expect(
        (
          await db.query<{ name: string }>(
            "SELECT effective_subscription_plan('10000000-0000-4000-8000-000000000001') AS name",
          )
        ).rows[0].name,
      ).toBe("discovery");
      await expect(db.exec(bundle)).rejects.toThrow(
        "WARKO_LAUNCH_ALREADY_APPLIED",
      );
      await db.exec("ROLLBACK");
      expect(
        (await db.query("SELECT * FROM billing_settings")).rows,
      ).toHaveLength(1);
    } finally {
      await db.close();
    }
  },
  60000,
);
