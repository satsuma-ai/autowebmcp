import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, FileCode2, MessageSquare, Sparkles, Zap } from "lucide-react";
import { Nav } from "@/components/Nav";
import { useProject, projectStore, type WebMCPTool } from "@/lib/store";
import { CodeBlock } from "@/components/CodeBlock";
import { SafetyBadge, ConfidenceBadge } from "@/components/ToolBadges";
import { bridgeScript, manifest, toolRegistrationCode, WEBMCP_DOCS } from "@/lib/webmcp-codegen";


export const Route = createFileRoute("/generated")({
  component: GeneratedPage,
});

function GeneratedPage() {
  const project = useProject();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!project) navigate({ to: "/" });
  }, [project, navigate]);

  useEffect(() => {
    if (project && !selected && project.tools[0]) setSelected(project.tools[0].name);
  }, [project, selected]);

  if (!project) return null;
  const tool = project.tools.find((t) => t.name === selected) ?? project.tools[0];
  const enabledCount = project.tools.filter((t) => t.enabled).length;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready to activate
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              WebMCP generated for <span className="gradient-text">{project.domain}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {project.summary} Auto WebMCP turned visible journeys into structured tools agents can call safely.
            </p>
          </div>
          <Link
            to="/activate"
            className="glow inline-flex h-12 items-center gap-2 self-end rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:scale-[1.02] transition-transform"
          >
            Activate at the edge <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* metrics */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Tools generated" value={project.tools.length} icon={FileCode2} />
          <Metric label="Forms mapped" value={project.scan.formsFound} icon={Sparkles} />
          <Metric label="Agent actions exposed" value={enabledCount} icon={Zap} />
          <Metric label="Estimated setup" value="< 2 min" icon={CheckCircle2} text />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          {/* Tool list */}
          <aside className="glass rounded-2xl p-3 lg:col-span-4">
            <h2 className="px-3 pt-2 pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Generated tools · {project.tools.length}
            </h2>
            <ul className="space-y-1.5">
              {project.tools.map((t) => (
                <li key={t.name}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(t.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(t.name);
                      }
                    }}
                    className={`group block w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition-colors ${
                      selected === t.name
                        ? "border-primary/40 bg-primary/8"
                        : "border-transparent hover:border-border/60 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13.5px] text-foreground truncate">{t.name}</span>
                        </div>
                        <div className="mt-1 line-clamp-1 text-[12px] text-muted-foreground">{t.description}</div>
                      </div>
                      <Toggle
                        checked={t.enabled}
                        onChange={(v) => projectStore.updateTool(t.name, { enabled: v })}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <SafetyBadge safety={t.safety} />
                      <ConfidenceBadge value={t.confidence} />
                    </div>
                  </div>

                </li>
              ))}
            </ul>
          </aside>

          {/* Tool detail */}
          {tool && (
            <section className="lg:col-span-8 space-y-6">
              <div className="glass rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-xl">{tool.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{tool.label}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <SafetyBadge safety={tool.safety} />
                    <ConfidenceBadge value={tool.confidence} />
                    <span className="inline-flex items-center rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[10.5px] font-medium text-info">
                      {tool.method} {tool.path}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/85">{tool.description}</p>
                <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Example agent prompt</div>
                  <div className="mt-1 text-foreground/90">"{tool.examplePrompt}"</div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <SectionTitle>JSON Schema</SectionTitle>
                  <CodeBlock language="schema.json" code={JSON.stringify(tool.inputSchema, null, 2)} />
                </div>
                <div>
                  <SectionTitle>document.modelContext.registerTool</SectionTitle>
                  <CodeBlock language="webmcp.ts" code={toolRegistrationCode(tool)} />
                </div>
              </div>

              <AgentPreview tool={tool} domain={project.domain} />

              <div>
                <SectionTitle>webmcp-tools.js · full drop-in module</SectionTitle>
                <CodeBlock language="webmcp-tools.js" code={bridgeScript(project.domain, project.tools)} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Registers on <span className="font-mono">document.modelContext</span> per the{" "}
                  <a href={WEBMCP_DOCS.chromeImperative} target="_blank" rel="noreferrer" className="text-primary underline">
                    Chrome WebMCP imperative API
                  </a>
                  , with a fallback to the deprecated <span className="font-mono">navigator.modelContext</span> alias.
                </p>
              </div>

              <div>
                <SectionTitle>WebMCP manifest</SectionTitle>
                <CodeBlock
                  language="manifest.json"
                  code={JSON.stringify(manifest(project.domain, project.tools), null, 2)}
                />
              </div>

            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</h3>;
}

function Metric({ label, value, icon: Icon, text }: { label: string; value: number | string; icon: React.ElementType; text?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-2 ${text ? "text-xl" : "text-3xl"} font-semibold text-foreground`}>{value}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors ${
        checked ? "bg-primary border-primary" : "bg-muted border-border"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}


function AgentPreview({ tool, domain }: { tool: WebMCPTool; domain: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Agent preview</h3>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <Bubble role="agent" name="Agent">
          {tool.examplePrompt}
        </Bubble>
        <Bubble role="webmcp" name="Auto WebMCP">
          Using <span className="font-mono text-primary">{tool.name}</span> from {domain}.
        </Bubble>
        <Bubble role="result" name="Result">
          {tool.safety === "safe"
            ? "Action completed successfully."
            : "Action staged. Confirmation required from the site before commit."}
        </Bubble>
      </div>
    </div>
  );
}

function Bubble({ role, name, children }: { role: "agent" | "webmcp" | "result"; name: string; children: React.ReactNode }) {
  const styles =
    role === "agent"
      ? "bg-info/10 border-info/25 text-foreground"
      : role === "webmcp"
        ? "bg-primary/10 border-primary/25 text-foreground"
        : "bg-success/10 border-success/25 text-foreground";
  const Icon = role === "agent" ? Bot : role === "webmcp" ? Sparkles : MessageSquare;
  return (
    <div className={`rounded-xl border ${styles} p-3.5`}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {name}
      </div>
      <div className="text-foreground/90">{children}</div>
    </div>
  );
}
