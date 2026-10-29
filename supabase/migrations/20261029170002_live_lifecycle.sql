ALTER TABLE public.live_sessions DROP CONSTRAINT live_sessions_status_check;
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_status_check CHECK(status IN ('planned','active','completed','cancelled'));
ALTER TABLE public.live_sessions ADD COLUMN started_at timestamptz, ADD COLUMN closed_at timestamptz;
