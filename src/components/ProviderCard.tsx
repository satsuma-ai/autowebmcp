import { Cloud, Globe, Server, Shield, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Provider {
  id: string;
  name: string;
  tagline: string;
  description: string;
  cta: string;
  successLabel: string;
  installLabel: string;
  installSnippet: string;
  accent: string;
  icon: LucideIcon;
}

export const PROVIDERS: Provider[] = [
  {
    id: "cloudflare",
    name: "Cloudflare Workers",
    tagline: "Activate with a Cloudflare Worker",
    description: "Deploy a lightweight Worker that injects the Auto WebMCP layer and exposes generated tools in the browser context.",
    cta: "Activate Worker",
    successLabel: "Worker deployed",
    installLabel: "Install as Worker route",
    installSnippet: `// wrangler.toml
name = "{slug}-webmcp"
main = "src/worker.ts"
routes = [{ pattern = "{domain}/*", zone_name = "{domain}" }]`,
    accent: "oklch(0.78 0.18 55)",
    icon: Cloud,
  },
  {
    id: "akamai",
    name: "Akamai EdgeWorkers",
    tagline: "Deploy as an Akamai EdgeWorker",
    description: "Package the WebMCP layer as an Akamai EdgeWorker and attach it to your property configuration.",
    cta: "Create EdgeWorker bundle",
    successLabel: "EdgeWorker bundle ready",
    installLabel: "Attach EdgeWorker to property rule",
    installSnippet: `// bundle.json
{
  "edgeworker-version": "1.0",
  "description": "Auto WebMCP injector for {domain}"
}`,
    accent: "oklch(0.72 0.14 230)",
    icon: Globe,
  },
  {
    id: "fastly",
    name: "Fastly Compute / VCL",
    tagline: "Publish as Fastly Compute or VCL",
    description: "Publish the WebMCP layer through Fastly Compute or attach it with a VCL snippet for edge-side injection.",
    cta: "Generate Fastly package",
    successLabel: "Fastly package ready",
    installLabel: "Add Compute service or VCL recv/deliver snippet",
    installSnippet: `// fastly.toml
service_id = "{slug}-webmcp"
language = "rust"
manifest_version = 3`,
    accent: "oklch(0.7 0.2 25)",
    icon: Server,
  },
  {
    id: "human",
    name: "HUMAN Enforcer",
    tagline: "Attach through HUMAN Enforcer",
    description: "Attach Auto WebMCP through your HUMAN Enforcer deployment path, alongside existing bot and fraud controls.",
    cta: "Prepare HUMAN config",
    successLabel: "Enforcer config ready",
    installLabel: "Add Auto WebMCP as an Enforcer-side companion snippet",
    installSnippet: `# human-enforcer.yaml
companion:
  name: auto-webmcp
  inject: pre-response
  site: {domain}`,
    accent: "oklch(0.72 0.16 290)",
    icon: ShieldCheck,
  },
  {
    id: "datadome",
    name: "DataDome Edge Module",
    tagline: "Attach through DataDome Edge Module",
    description: "Attach Auto WebMCP through your DataDome edge module using Cloudflare Worker, Akamai EdgeWorker, Fastly VCL, or Fastly Compute patterns.",
    cta: "Prepare DataDome config",
    successLabel: "Edge module config ready",
    installLabel: "Attach alongside the DataDome edge module and client-side tag",
    installSnippet: `// datadome.config.js
module.exports = {
  companion: "auto-webmcp",
  attach: ["worker", "edgeworker", "vcl", "compute"],
  site: "{domain}",
};`,
    accent: "oklch(0.74 0.17 152)",
    icon: Shield,
  },
];

export function ProviderCard({
  provider,
  status,
  onActivate,
  busy,
}: {
  provider: Provider;
  status: "idle" | "active";
  onActivate: () => void;
  busy?: boolean;
}) {
  const Icon = provider.icon;
  return (
    <div className="glass relative flex flex-col rounded-2xl p-5 transition-all hover:border-white/15">
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in oklab, ${provider.accent} 18%, transparent)`, color: provider.accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        {status === "active" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-1 text-[11px] font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {provider.successLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
            Ready
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold">{provider.name}</h3>
      <p className="mt-1 text-[13px] font-medium text-foreground/80">{provider.tagline}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{provider.description}</p>
      <button
        onClick={onActivate}
        disabled={busy}
        className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-foreground/95 px-3.5 text-sm font-medium text-background transition-colors hover:bg-foreground disabled:opacity-50"
      >
        {status === "active" ? "Reconfigure" : busy ? "Activating…" : provider.cta}
      </button>
    </div>
  );
}
