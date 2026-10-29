-- Shop configuration and resumable onboarding. Completion is derived from real rows,
-- never from these UI progress fields. Writes use tenant/admin-scoped server routes.
ALTER TABLE public.organizations
  ADD COLUMN country text NOT NULL DEFAULT 'CI' CHECK (country IN ('SN','CI','BF','ML','TG','BJ')),
  ADD COLUMN currency text NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  ADD COLUMN default_delivery_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (default_delivery_fee >= 0),
  ADD COLUMN onboarding_step smallint CHECK (onboarding_step BETWEEN 1 AND 3),
  ADD COLUMN onboarding_skipped_steps integer[] NOT NULL DEFAULT '{}' CHECK (onboarding_skipped_steps <@ ARRAY[1,2,3]),
  ADD COLUMN onboarding_started_at timestamptz,
  ADD COLUMN notifications_unsubscribed_at timestamptz;
