CREATE TABLE public.scan_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  site_name TEXT,
  category TEXT,
  tool_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'ui',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scan_events TO anon, authenticated;
GRANT ALL ON public.scan_events TO service_role;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view scan events" ON public.scan_events FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX scan_events_created_at_idx ON public.scan_events (created_at DESC);

CREATE TABLE public.scan_throttle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.scan_throttle TO service_role;
ALTER TABLE public.scan_throttle ENABLE ROW LEVEL SECURITY;
CREATE INDEX scan_throttle_lookup_idx ON public.scan_throttle (ip_hash, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_events;