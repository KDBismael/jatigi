-- ============================================================
-- Jatigi/Warko — Migration 008: platform (super) admin
-- ============================================================
-- Introduces a platform operator that sits ABOVE all organizations. A platform
-- admin is an auth.users login registered in platform_admins, with NO profile
-- and NO organization. It is read-only and lives in its own /admin area; the app
-- reaches cross-org data through the service-role client (which bypasses RLS).

CREATE TABLE platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- A user may read ONLY their own membership row. This lets the auth proxy (anon
-- client) detect whether the logged-in user is a platform admin. There is no
-- authenticated insert/update/delete — membership is managed via service role / SQL.
CREATE POLICY "Users read own platform admin row" ON platform_admins
  FOR SELECT USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- Owner concept: mark each organization's owner (its first admin).
-- ------------------------------------------------------------
ALTER TABLE organizations ADD COLUMN owner_id UUID REFERENCES profiles(id);

UPDATE organizations o SET owner_id = (
  SELECT p.id FROM profiles p
  WHERE p.organization_id = o.id AND p.role = 'admin'
  ORDER BY p.created_at ASC
  LIMIT 1
);

-- ============================================================
-- ONE-TIME PROVISIONING
-- ============================================================
-- IMPORTANT: do NOT hand-insert into auth.users — GoTrue rejects such logins
-- ("Database error querying schema") because it also needs a matching
-- auth.identities row and several auth columns must be '' (empty), not NULL.
--
-- RECOMMENDED (bulletproof): create the auth user via Supabase's own API, then
-- register it here. Either:
--   • Dashboard → Authentication → Users → "Add user":
--       email = superadmin@warko.app, set the generated password, tick
--       "Auto Confirm User".
--   • or CLI/Admin API: supabase.auth.admin.createUser({ email, password, email_confirm: true })
-- Then run:
--
--   INSERT INTO platform_admins (user_id)
--   SELECT id FROM auth.users WHERE email = 'superadmin@warko.app'
--   ON CONFLICT DO NOTHING;
--
-- ------------------------------------------------------------
-- FALLBACK — pure SQL (creates the user + identity correctly). Requires pgcrypto.
-- If you already ran a broken insert, first remove it:
--   DELETE FROM auth.users WHERE email = 'superadmin@warko.app';
-- ------------------------------------------------------------
--
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
--
-- WITH new_user AS (
--   INSERT INTO auth.users (
--     instance_id, id, aud, role, email, encrypted_password,
--     email_confirmed_at, created_at, updated_at,
--     confirmation_token, recovery_token, email_change_token_new, email_change,
--     raw_app_meta_data, raw_user_meta_data
--   ) VALUES (
--     '00000000-0000-0000-0000-000000000000',
--     gen_random_uuid(), 'authenticated', 'authenticated',
--     'superadmin@warko.app',
--     crypt('<GENERATED_LONG_PASSWORD>', gen_salt('bf')),
--     now(), now(), now(),
--     '', '', '', '',
--     '{"provider":"email","providers":["email"]}', '{}'
--   ) RETURNING id
-- ), new_identity AS (
--   INSERT INTO auth.identities (
--     provider_id, user_id, identity_data, provider,
--     last_sign_in_at, created_at, updated_at
--   )
--   SELECT id::text, id,
--     jsonb_build_object('sub', id::text, 'email', 'superadmin@warko.app'),
--     'email', now(), now(), now()
--   FROM new_user
--   RETURNING user_id
-- )
-- INSERT INTO platform_admins (user_id) SELECT user_id FROM new_identity;
