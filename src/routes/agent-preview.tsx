import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, ChevronRight, Sparkles } from "lucide-react";
import { Nav } from "@/components/Nav";
import { useProject, type WebMCPTool } from "@/lib/store";
import { SafetyBadge, ConfidenceBadge } from "@/components/ToolBadges";

export const Route = createFileRoute("/agent-preview")({
  component: AgentPreviewPage,
});

interface Line {
  kind: "info" | "tool" | "result";
  text: string;
  tool?: string;
}

function AgentPreviewPage() {
  const project = useProject();
  const navigate = useNavigate();
  const [lines, setLines] = useState<Line[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!project) navigate({ to: "/" });
  }, [project, navigate]);

  useEffect(() => {
    if (!project || startedRef.current) return;
    startedRef.current = true;
    const enabled = project.tools.filter((t) => t.enabled);
    const seq: { delay: number; line: Line; setActive?: string | null }[] = [
      { delay: 400, line: { kind: "info", text: `Visiting ${project.domain}...` } },
      { delay: 800, line: { kind: "info", text: `Discovered ${enabled.length} WebMCP tools.` } },
    ];
    enabled.slice(0, 4).forEach((t, i) => {
      seq.push({ delay: 700, line: { kind: "tool", text: `Calling ${t.name}...`, tool: t.name }, setActive: t.name });
      seq.push({
        delay: 700,
        line: {
          kind: "result",
          text:
            t.safety === "safe"
              ? `${t.name} completed successfully.`
              : `${t.name} staged — confirmation required.`,
        },
      });
      if (i === 1) seq.push({ delay: 400, line: { kind: "info", text: "Agents are interacting through structured tools, not pixels." } });
    });
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    seq.forEach((s) => {
      cumulative += s.delay;
      timers.push(
        setTimeout(() => {
          setLines((prev) => [...prev, s.line]);
          if (s.setActive !== undefined) setActiveTool(s.setActive);
        }, cumulative),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [project]);

  useEffect(() => {
    consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  if (!project) return null;
  const enabled = project.tools.filter((t) => t.enabled);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Agent preview · <span className="gradient-text">{project.domain}</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              A simulated agent discovers and calls Auto WebMCP tools. Safe actuation by default.
            </p>
          </div>
          <Link to="/generated" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Back to tools <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Browser preview */}
          <div className="glass-strong overflow-hidden rounded-2xl lg:col-span-3">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                https://{project.domain}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> WebMCP active
              </span>
            </div>
            <div className="relative h-[420px] p-6">
              <div className="grid-bg absolute inset-0 opacity-30" />
              <div className="relative">
                <div className="h-8 w-2/3 rounded-md bg-white/8" />
                <div className="mt-3 h-4 w-1/2 rounded-md bg-white/5" />
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 rounded-lg border border-white/5 bg-white/[0.04]" />
                  ))}
                </div>
                <div className="mt-6 flex gap-2">
                  <div className="h-9 w-32 rounded-md bg-primary/80" />
                  <div className="h-9 w-24 rounded-md border border-white/10" />
                </div>
                {activeTool && (
                  <div className="glass absolute bottom-0 right-0 max-w-xs rounded-xl p-3 text-xs">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="font-mono">{activeTool}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground">invoked by agent · structured tool call</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Console */}
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Agent console</h2>
            </div>
            <div ref={consoleRef} className="code-panel mt-3 h-[360px] overflow-auto px-4 py-3 text-[12.5px]">
              {lines.map((l, i) => (
                <div key={i} className="font-mono">
                  <span className="text-muted-foreground">{">"} </span>
                  <span
                    className={
                      l.kind === "tool" ? "text-primary" : l.kind === "result" ? "text-success" : "text-foreground/80"
                    }
                  >
                    {l.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tool inspector */}
        <div className="glass mt-6 rounded-2xl p-5">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Tool inspector</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enabled.map((t) => (
              <InspectorTool key={t.name} t={t} active={activeTool === t.name} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function InspectorTool({ t, active }: { t: WebMCPTool; active: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        active ? "border-primary/50 bg-primary/8" : "border-border/60 bg-card/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-foreground">{t.name}</span>
        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">{t.method}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <SafetyBadge safety={t.safety} />
        <ConfidenceBadge value={t.confidence} />
      </div>
    </div>
  );
}
