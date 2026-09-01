import { useEffect, useState } from "react";
import { Activity, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ScanEvent {
  id: string;
  domain: string;
  site_name: string | null;
  category: string | null;
  tool_count: number;
  created_at: string;
}

function ago(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function LiveScans() {
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("scan_events")
          .select("id, domain, site_name, category, tool_count, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("scan_events").select("id", { count: "exact", head: true }),
      ]);
      if (!active) return;
      setEvents((data ?? []) as ScanEvent[]);
      setTotal(count ?? 0);
    }
    void load();

    const channel = supabase
      .channel("scan-events-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scan_events" }, (payload) => {
        setEvents((prev) => [payload.new as ScanEvent, ...prev].slice(0, 8));
        setTotal((prev) => (prev == null ? prev : prev + 1));
      })
      .subscribe();

    const timer = setInterval(() => setTick((t) => t + 1), 15000);

    return () => {
      active = false;
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  const toolsTotal = events.reduce((n, e) => n + e.tool_count, 0);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16" aria-labelledby="live-scans-heading" data-tick={tick}>
      <div className="glass-strong rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live
            </div>
            <h2 id="live-scans-heading" className="mt-2 text-2xl font-semibold tracking-tight">
              Scans running right now
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every site Auto WebMCP has analysed, newest first. Target URLs only, no scan contents.
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-3xl font-semibold tabular-nums">{total ?? "—"}</div>
              <div className="text-xs text-muted-foreground">total scans</div>
            </div>
            <div>
              <div className="text-3xl font-semibold tabular-nums">{toolsTotal || "—"}</div>
              <div className="text-xs text-muted-foreground">tools in last {events.length || 0}</div>
            </div>
          </div>
        </div>

        <ul className="mt-6 divide-y divide-border/50">
          {events.length === 0 && (
            <li className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              <Radio className="h-4 w-4" /> No scans yet — run the first one above.
            </li>
          )}
          {events.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Activity className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.domain}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {e.site_name || "—"}
                    {e.category ? ` · ${e.category.replace(/_/g, " ")}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 px-2 py-0.5 tabular-nums">
                  {e.tool_count} tools
                </span>
                <span className="tabular-nums">{ago(e.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
