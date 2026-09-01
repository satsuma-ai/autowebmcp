import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Copy, Download, ExternalLink, Sparkles } from "lucide-react";
import { Nav } from "@/components/Nav";
import { useProject } from "@/lib/store";
import { CodeBlock } from "@/components/CodeBlock";
import { parseDomain } from "@/lib/tool-generator";
import { bridgeScript, manifest, DEPLOY_TARGETS, WEBMCP_DOCS, type DeployTargetId } from "@/lib/webmcp-codegen";
import { toast } from "sonner";

export const Route = createFileRoute("/success")({
  component: SuccessPage,
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

function SuccessPage() {
  const project = useProject();
  const navigate = useNavigate();
  const [targetId, setTargetId] = useState<DeployTargetId>("cloudflare");

  useEffect(() => {
    if (!project) navigate({ to: "/" });
  }, [project, navigate]);

  useEffect(() => {
    const p = project?.selectedProvider;
    if (p && DEPLOY_TARGETS.some((t) => t.id === p)) setTargetId(p as DeployTargetId);
  }, [project?.selectedProvider]);


  const target = useMemo(() => DEPLOY_TARGETS.find((t) => t.id === targetId)!, [targetId]);

  if (!project) return null;
  const { slug } = parseDomain(project.url);
  const enabled = project.tools.filter((t) => t.enabled);
  const script = bridgeScript(project.domain, project.tools);
  const manifestJson = JSON.stringify(manifest(project.domain, project.tools), null, 2);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="pointer-events-none absolute inset-x-0 top-32 mx-auto h-72 max-w-3xl bg-primary/20 blur-[120px]" />

        <div className="relative text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> WebMCP generated
          </div>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight sm:text-6xl">
            <span className="gradient-text">{project.domain}</span> is now agent-ready.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {enabled.length} tools registered on <span className="font-mono text-foreground">document.modelContext</span>. Pick where
            it ships — host it with your app, or inject it at the edge with no origin change.
          </p>
        </div>

        {/* Step 1 — the artifact */}
        <div className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-primary">Step 1</div>
              <h2 className="mt-1 text-2xl font-semibold">Your generated WebMCP module</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Real <span className="font-mono">registerTool</span> calls with{" "}
                <span className="font-mono">execute</span> handlers against your existing endpoints.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  download("webmcp-tools.js", script, "text/javascript");
                  toast.success("webmcp-tools.js downloaded");
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Download className="h-4 w-4" /> webmcp-tools.js
              </button>
              <button
                onClick={() => {
                  download("webmcp-manifest.json", manifestJson, "application/json");
                  toast.success("Manifest downloaded");
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
              >
                <Download className="h-4 w-4" /> manifest.json
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(script);
                  toast.success("Module copied");
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
            </div>
          </div>
          <div className="mt-4 max-h-[420px] overflow-auto rounded-xl">
            <CodeBlock language="webmcp-tools.js" code={script} />
          </div>
        </div>

        {/* Step 2 — where it ships */}
        <div className="mt-16">
          <div className="text-xs uppercase tracking-wider text-primary">Step 2</div>
          <h2 className="mt-1 text-2xl font-semibold">Choose how to ship it</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {DEPLOY_TARGETS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTargetId(t.id)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
                  targetId === t.id
                    ? "border-primary bg-primary/12 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {t.name}
                <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                  {t.kind === "edge" ? "edge" : "host"}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <div className="glass rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-base font-semibold">{target.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{target.summary}</p>
              <ol className="mt-4 space-y-2.5 text-sm">
                {target.steps.map((s, i) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-foreground/85">{s.replace("{domain}", project.domain)}</span>
                  </li>
                ))}
              </ol>
              <a
                href={target.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Official docs <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="lg:col-span-3">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{target.fileName}</h3>
              <CodeBlock language={target.language} code={target.code(project.domain)} />
              <button
                onClick={() => {
                  download(target.fileName.split("/").pop()!, target.code(project.domain), "text/plain");
                  toast.success(`${target.fileName} downloaded`);
                }}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent"
              >
                <Download className="h-4 w-4" /> Download {target.fileName.split("/").pop()}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-14 glass rounded-2xl p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Verify in the browser</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Open the page in Chrome with WebMCP enabled and confirm the tools are exposed to the agent.
          </p>
          <div className="mt-3">
            <CodeBlock
              language="devtools"
              code={`// DevTools console on ${project.domain}
const tools = await document.modelContext.getTools();
console.table(tools.map(t => ({ name: t.name, description: t.description })));

// Cloudflare Browser Run lab session (agent-side testing surface)
await navigator.modelContextTesting.listTools();
await navigator.modelContextTesting.executeTool(
  "${enabled[0]?.name ?? "search"}",
  JSON.stringify(${JSON.stringify(
    Object.fromEntries(
      Object.keys(enabled[0]?.inputSchema.properties ?? { query: {} }).slice(0, 2).map((k) => [k, "example"]),
    ),
  )}),
);`}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {[
              ["Chrome imperative API", WEBMCP_DOCS.chromeImperative],
              ["OpenAI WebMCP guide", WEBMCP_DOCS.openaiWebmcp],
              ["Cloudflare WebMCP", WEBMCP_DOCS.cloudflareBlog],
              ["Browser Run testing", WEBMCP_DOCS.cloudflareBrowserRun],
              ["Polyfill", WEBMCP_DOCS.polyfill],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground hover:text-foreground"
              >
                {label} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link
            to="/agent-preview"
            className="glow inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:scale-[1.02] transition-transform"
          >
            <Sparkles className="h-4 w-4" /> Open agent preview
          </Link>
          <button
            onClick={() => {
              download(
                `${slug}-webmcp-bundle.json`,
                JSON.stringify({ site: project.domain, target: target.id, manifest: JSON.parse(manifestJson) }, null, 2),
                "application/json",
              );
              toast.success("Bundle downloaded");
            }}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Download full bundle
          </button>
        </div>

        <div className="mt-16 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            Scan another site <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
