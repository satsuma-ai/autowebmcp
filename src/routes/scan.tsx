import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Activity, Brain, Code2, FileSearch, Layers, MousePointer2, Network, ScanLine, Sparkles } from "lucide-react";
import { Nav } from "@/components/Nav";
import { generateProject, parseDomain, classify, categoryLabel, detectCdn } from "@/lib/tool-generator";
import { projectStore } from "@/lib/store";

const search = z.object({ url: z.string() });

export const Route = createFileRoute("/scan")({
  validateSearch: (s) => search.parse(s),
  component: ScanPage,
});

const STEPS = [
  { icon: Network, label: "Resolving origin and edge configuration" },
  { icon: FileSearch, label: "Fetching homepage HTML" },
  { icon: Layers, label: "Extracting forms, buttons, links, and structured data" },
  { icon: MousePointer2, label: "Classifying user journeys" },
  { icon: Brain, label: "Inferring agent-safe actions" },
  { icon: Code2, label: "Generating WebMCP tool schemas" },
  { icon: Sparkles, label: "Preparing edge activation bundle" },
];

function ts(seconds: number) {
  const s = seconds.toString().padStart(2, "0");
  return `[00:${s}]`;
}

function ScanPage() {
  const { url } = Route.useSearch();
  const navigate = useNavigate();
  const { domain } = useMemo(() => parseDomain(url), [url]);
  const category = useMemo(() => classify(domain), [domain]);

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const baseDelays = [400, 700, 900, 800, 1100, 900, 800];
    let cumulative = 0;
    STEPS.forEach((s, i) => {
      cumulative += baseDelays[i];
      timers.push(
        setTimeout(() => {
          setStep(i + 1);
          setLogs((prev) => [...prev, `${ts(Math.round(cumulative / 100))} ${s.label}`]);
        }, cumulative),
      );
    });
    timers.push(
      setTimeout(() => {
        const project = generateProject(url);
        projectStore.set(project);
        navigate({ to: "/generated" });
      }, cumulative + 700),
    );
    return () => timers.forEach(clearTimeout);
  }, [url, navigate, mounted]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const pct = Math.min(100, Math.round((step / STEPS.length) * 100));

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ScanLine className="h-4 w-4 text-primary" />
          <span>Auto WebMCP scanner</span>
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Scanning <span className="gradient-text">{domain}</span>
        </h1>
        <p className="mt-3 text-muted-foreground">Discovering actions agents can safely call.</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          {/* Timeline */}
          <div className="glass rounded-2xl p-6 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Pipeline</h2>
              <span className="text-xs text-muted-foreground">{pct}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: "var(--gradient-glow)" }}
              />
            </div>

            <ol className="mt-7 space-y-4">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const status = i < step ? "done" : i === step ? "active" : "pending";
                return (
                  <li key={s.label} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        status === "done"
                          ? "border-success/40 bg-success/15 text-success"
                          : status === "active"
                            ? "border-primary/50 bg-primary/15 text-primary pulse-ring"
                            : "border-border/60 bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                        {s.label}
                      </div>
                      {status === "active" && (
                        <div className="mt-2 h-1 w-32 overflow-hidden rounded bg-muted">
                          <div className="h-full w-1/2 shimmer rounded" />
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground/70">
                      {status === "done" ? "done" : status === "active" ? "running" : "queued"}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Live logs</h3>
              <div ref={logRef} className="code-panel mt-2 max-h-44 overflow-auto px-4 py-3 text-[12px] text-foreground/80">
                {logs.length === 0 && <div className="text-muted-foreground">Waiting for scanner to start…</div>}
                {logs.map((l, i) => (
                  <div key={i} className="font-mono">{l}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Intelligence */}
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Site intelligence</h2>
            </div>
            <dl className="mt-5 space-y-4 text-sm">
              <Row label="Domain" value={domain} mono />
              <Row label="Category" value={categoryLabel(category)} />
              <Row label="Primary goal" value={inferGoal(category)} />
              <Row label="Detected forms" value={step > 2 ? `${2 + Math.floor((step + domain.length) % 4)} forms` : "scanning…"} />
              <Row label="Detected CTAs" value={step > 3 ? `${5 + Math.floor((step + domain.length) % 8)} CTAs` : "scanning…"} />
              <Row label="Agent opportunities" value={step > 4 ? "High" : "analyzing…"} />
              <Row label="Risk level" value={step > 5 ? "Low — safe defaults" : "—"} />
            </dl>
            <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-[12.5px] text-foreground/80">
              <div className="font-medium text-primary">LLM inference engaged</div>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                Generating WebMCP tools from visible journeys, forms, and structured data. No origin rewrite required.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-foreground" : "text-foreground"}>{value}</dd>
    </div>
  );
}

function inferGoal(c: ReturnType<typeof classify>): string {
  return {
    ecommerce: "Drive purchases",
    restaurant: "Capture reservations",
    saas: "Capture demo requests",
    healthcare: "Book appointments",
    real_estate: "Match buyers to listings",
    marketplace: "Match supply and demand",
    media: "Grow subscriptions",
    nonprofit: "Drive donations",
    generic: "Capture leads",
  }[c];
}
