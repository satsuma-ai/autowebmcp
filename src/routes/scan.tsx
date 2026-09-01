import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Activity, Brain, Code2, FileSearch, Layers, MousePointer2, Network, ScanLine, Sparkles } from "lucide-react";
import { Nav } from "@/components/Nav";
import { useServerFn } from "@tanstack/react-start";
import { generateProject, parseDomain, classify, categoryLabel, detectCdn } from "@/lib/tool-generator";
import { projectStore, type ProjectState } from "@/lib/store";
import { generateWebmcpProject } from "@/lib/webmcp-generate.functions";

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
  const cdn = useMemo(() => detectCdn(domain), [domain]);
  const runGenerate = useServerFn(generateWebmcpProject);

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<ProjectState | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

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
          setStep((prev) => (i + 1 > prev ? i + 1 : prev));
          setLogs((prev) => [...prev, `${ts(Math.round(cumulative / 100))} ${s.label}`]);
        }, cumulative),
      );
    });

    const started = Date.now();
    runGenerate({ data: { url } })
      .then((project) => {
        setResult(project);
        setLogs((prev) => [
          ...prev,
          `[live] fetched ${project.domain} · ${project.scan.formsFound} forms · ${project.scan.ctasFound} CTAs · ${project.scan.apiCandidates} endpoint candidates`,
          `[live] designed ${project.tools.length} WebMCP tools for "${project.primaryGoal}"`,
          ...project.scan.warnings.map((w) => `[warn] ${w}`),
        ]);
        projectStore.set(project);
        const elapsed = Date.now() - started;
        const wait = Math.max(600, 5900 - elapsed);
        timers.push(
          setTimeout(() => {
            if (doneRef.current) return;
            doneRef.current = true;
            setStep(STEPS.length);
            navigate({ to: "/generated" });
          }, wait),
        );
      })
      .catch((e: unknown) => {
        setLogs((prev) => [...prev, `[warn] live analysis unavailable (${String(e).slice(0, 90)}) — using structural heuristics`]);
        const project = generateProject(url);
        setResult(project);
        projectStore.set(project);
        timers.push(
          setTimeout(() => {
            if (doneRef.current) return;
            doneRef.current = true;
            navigate({ to: "/generated" });
          }, 1200),
        );
      });

    return () => timers.forEach(clearTimeout);
  }, [url, navigate, mounted, runGenerate]);

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
        <p className="mt-3 text-muted-foreground">Fetching the live site and designing the tool set agents can safely call.</p>

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
              <Row label="Category" value={result ? categoryLabel(result.category) : "classifying…"} />
              <Row label="Primary goal" value={result ? result.primaryGoal : inferGoal(classify(domain))} />
              <Row label="Detected forms" value={result ? `${result.scan.formsFound} forms` : "fetching…"} />
              <Row label="Detected CTAs" value={result ? `${result.scan.ctasFound} CTAs` : "fetching…"} />
              <Row label="Endpoint candidates" value={result ? `${result.scan.apiCandidates}` : "fetching…"} />
              <Row label="Tools designed" value={result ? `${result.tools.length}` : "designing…"} />
              <Row
                label="Detected edge / CDN"
                value={step > 0 ? `${cdn.providerName} · ${Math.round(cdn.confidence * 100)}%` : "fingerprinting…"}
              />
              <Row
                label="Risk level"
                value={result ? (result.tools.some((t) => t.safety !== "safe") ? "Guarded writes present" : "Read-only") : "—"}
              />
            </dl>
            {step > 0 && (
              <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-[12.5px] text-foreground/80">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-primary">Recommended activation</div>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">auto-detected</span>
                </div>
                <p className="mt-1 leading-relaxed text-muted-foreground">
                  Activate Auto WebMCP through <span className="text-foreground font-medium">{cdn.providerName}</span> — already in {domain}'s traffic path.
                </p>
                <ul className="mt-2 space-y-0.5 text-[11.5px] text-muted-foreground/90 font-mono">
                  {cdn.evidence.map((e) => (
                    <li key={e}>· {e}</li>
                  ))}
                </ul>
              </div>
            )}
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
    food_delivery: "Turn cravings into tracked orders",
    ecommerce: "Drive purchases",
    restaurant: "Capture reservations",
    saas: "Capture demo requests",
    healthcare: "Book appointments",
    real_estate: "Match buyers to listings",
    marketplace: "Match supply and demand",
    media: "Grow subscriptions",
    nonprofit: "Drive donations",
    automotive: "Configure, price and order a vehicle",
    travel: "Turn trip intent into a booking",
    generic: "Capture leads",
  }[c];
}
