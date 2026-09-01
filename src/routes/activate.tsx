import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Copy, Download, ExternalLink, Radar, Sparkles, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/Nav";
import { useProject, projectStore } from "@/lib/store";
import { CodeBlock } from "@/components/CodeBlock";
import {
  DEPLOY_TARGETS,
  aiBuilderPrompt,
  bridgeScript,
  type DeployTargetId,
} from "@/lib/webmcp-codegen";

export const Route = createFileRoute("/activate")({
  head: () => ({
    meta: [
      { title: "Install WebMCP on your site — Auto WebMCP by Satsuma.ai" },
      {
        name: "description",
        content:
          "Auto-detects your CDN or host, then gives exact dashboard steps or a copy-paste prompt for your AI website builder to ship WebMCP.",
      },
      { property: "og:title", content: "Install WebMCP on your site" },
      {
        property: "og:description",
        content: "Exact CDN dashboard steps or an AI-builder prompt to ship your generated WebMCP tools.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivatePage,
});

function download(name: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  URL.revokeObjectURL(u);
}

function ActivatePage() {
  const project = useProject();
  const navigate = useNavigate();
  const detectedId = project?.detectedCdn.providerId;
  const [targetId, setTargetId] = useState<DeployTargetId>("cloudflare");
  const [mode, setMode] = useState<"prompt" | "dashboard">("prompt");

  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !projectStore.get()) navigate({ to: "/" });
  }, [ready, navigate]);

  useEffect(() => {
    if (detectedId && DEPLOY_TARGETS.some((t) => t.id === detectedId)) {
      setTargetId(detectedId as DeployTargetId);
    }
  }, [detectedId]);

  const target = useMemo(() => DEPLOY_TARGETS.find((t) => t.id === targetId)!, [targetId]);

  if (!project) return null;

  const prompt = aiBuilderPrompt(project.domain, project.tools, target);
  const script = bridgeScript(project.domain, project.tools);
  const enabled = project.tools.filter((t) => t.enabled);

  function choose(id: DeployTargetId) {
    setTargetId(id);
    projectStore.patch({ selectedProvider: id });
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-14">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Ship WebMCP to <span className="gradient-text">{project.domain}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Nothing is deployed for you. Copy the generated prompt into your coding agent, or follow the exact steps in
          your provider's dashboard.
        </p>

        {/* Detection */}
        <div className="glass mt-8 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Radar className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Detected in {project.domain}'s traffic path:</span>
              <span className="font-medium text-foreground">{project.detectedCdn.providerName}</span>
              <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                {Math.round(project.detectedCdn.confidence * 100)}% match
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Detection is a starting point. Pick any target below.
            </span>
          </div>
          <ul className="mt-3 grid gap-1 text-[11.5px] font-mono text-muted-foreground/90 sm:grid-cols-3">
            {project.detectedCdn.evidence.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        </div>

        {/* Path picker */}
        <div className="mt-10 flex flex-wrap gap-2">
          {(
            [
              ["prompt", "Give it to your coding agent"],
              ["dashboard", `Do it in ${target.name}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
                mode === id
                  ? "border-primary bg-primary/12 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {id === "dashboard" ? <Terminal className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>

        {mode === "dashboard" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <div className="glass rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-base font-semibold">Log in to {target.dashboard.loginLabel}</h3>
              <a
                href={target.dashboard.loginUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Open {target.dashboard.loginLabel} <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <ol className="mt-5 space-y-2.5 text-sm">
                {target.dashboard.uiSteps.map((s, i) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-foreground/85">{s.replaceAll("{domain}", project.domain)}</span>
                  </li>
                ))}
              </ol>
              <a
                href={target.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Official {target.name} docs <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="lg:col-span-3">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {target.fileName}
              </h3>
              <CodeBlock language={target.language} code={target.code(project.domain)} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    download(target.fileName.split("/").pop()!, target.code(project.domain));
                    toast.success(`${target.fileName} downloaded`);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent"
                >
                  <Download className="h-4 w-4" /> {target.fileName.split("/").pop()}
                </button>
                <button
                  onClick={() => {
                    download("webmcp-tools.js", script, "text/javascript");
                    toast.success("webmcp-tools.js downloaded");
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent"
                >
                  <Download className="h-4 w-4" /> webmcp-tools.js
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Paste this into Codex, Claude Code, Lovable, v0, or Cursor</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Written for {target.name}, with all {enabled.length} generated tools and the full{" "}
                    <span className="font-mono">webmcp-tools.js</span> module inlined so the agent has everything it
                    needs.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(prompt);
                      toast.success("Prompt copied");
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <Copy className="h-4 w-4" /> Copy prompt
                  </button>
                  <button
                    onClick={() => {
                      download(`webmcp-prompt-${target.id}.md`, prompt, "text/markdown");
                      toast.success("Prompt downloaded");
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
                  >
                    <Download className="h-4 w-4" /> .md
                  </button>
                </div>
              </div>
              <div className="mt-4 max-h-[520px] overflow-auto rounded-xl">
                <CodeBlock language="prompt.md" code={prompt} />
              </div>
            </div>
          </div>
        )}

        {/* Target picker */}
        <div className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Where is {project.domain} served from?
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DEPLOY_TARGETS.map((t) => {
              const active = t.id === targetId;
              return (
                <button
                  key={t.id}
                  onClick={() => choose(t.id)}
                  className={`glass relative rounded-xl p-4 text-left transition-colors ${
                    active ? "border-primary/50 ring-1 ring-primary/40" : "hover:border-white/15"
                  }`}
                >
                  {t.id === detectedId && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Detected
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{t.name}</span>
                    <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t.kind}
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{t.summary}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-12">
          <Link
            to="/success"
            className="glow inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Full module, manifest and verification <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
