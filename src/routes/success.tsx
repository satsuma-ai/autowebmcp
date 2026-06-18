import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ArrowRight, CheckCircle2, Copy, Download, ExternalLink, Sparkles } from "lucide-react";
import { Nav } from "@/components/Nav";
import { useProject } from "@/lib/store";
import { PROVIDERS } from "@/components/ProviderCard";
import { CodeBlock } from "@/components/CodeBlock";
import { parseDomain } from "@/lib/tool-generator";
import { toast } from "sonner";

export const Route = createFileRoute("/success")({
  component: SuccessPage,
});

function SuccessPage() {
  const project = useProject();
  const navigate = useNavigate();

  useEffect(() => {
    if (!project) navigate({ to: "/" });
  }, [project, navigate]);

  const provider = useMemo(
    () => PROVIDERS.find((p) => p.id === project?.selectedProvider) ?? PROVIDERS[0],
    [project?.selectedProvider],
  );

  if (!project) return null;
  const { slug } = parseDomain(project.url);
  const enabled = project.tools.filter((t) => t.enabled);
  const installScript = `<script src="https://cdn.autowebmcp.com/v1/auto-webmcp.js" data-site="${project.domain}"></script>`;
  const providerSnippet = provider.installSnippet.replace(/{slug}/g, slug).replace(/{domain}/g, project.domain);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Confetti-like glow */}
        <div className="pointer-events-none absolute inset-x-0 top-32 mx-auto h-72 max-w-3xl bg-primary/20 blur-[120px]" />

        <div className="relative text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Activation complete
          </div>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight sm:text-6xl">
            <span className="gradient-text">{project.domain}</span> is now agent-ready.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {enabled.length} structured tools active. Edge activation through <span className="text-foreground">{provider.name}</span>. No origin rewrite required.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <SummaryCard title="Activated provider" value={provider.name} />
          <SummaryCard title="Generated tools" value={`${enabled.length} active · ${project.tools.length} total`} />
          <SummaryCard title="Agent entry URL" value={project.previewUrl!} mono />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Install snippet</h3>
            <CodeBlock language="html" code={installScript} />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{provider.installLabel}</h3>
            <CodeBlock language="config" code={providerSnippet} />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/agent-preview"
            className="glow inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:scale-[1.02] transition-transform"
          >
            <Sparkles className="h-4 w-4" /> Open agent preview
          </Link>
          <button
            onClick={() => {
              const bundle = { site: project.domain, provider: provider.id, tools: project.tools };
              const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
              const u = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = u;
              a.download = `${slug}-webmcp-bundle.json`;
              a.click();
              URL.revokeObjectURL(u);
              toast.success("Bundle downloaded");
            }}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Download bundle
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(installScript);
              toast.success("Install snippet copied");
            }}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium hover:bg-accent"
          >
            <Copy className="h-4 w-4" /> Copy install snippet
          </button>
          <a
            href={project.previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium hover:bg-accent"
            onClick={(e) => e.preventDefault()}
          >
            <ExternalLink className="h-4 w-4" /> Agent entry URL
          </a>
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

function SummaryCard({ title, value, mono }: { title: string; value: string; mono?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className={`mt-2 ${mono ? "font-mono text-sm" : "text-lg font-semibold"} break-words text-foreground`}>{value}</div>
    </div>
  );
}
