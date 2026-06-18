import { createFileRoute } from "@tanstack/react-router";
import { Cloud, Globe, KeyRound, Server, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { Nav } from "@/components/Nav";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Auto WebMCP by Satsuma.ai" }] }),
  component: SettingsPage,
});

const INTEGRATIONS = [
  { id: "openai", name: "OpenAI", desc: "LLM-inferred tool generation", icon: Sparkles, envs: ["OPENAI_API_KEY"] },
  { id: "cloudflare", name: "Cloudflare", desc: "Cloudflare Worker activation", icon: Cloud, envs: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"] },
  { id: "akamai", name: "Akamai", desc: "EdgeWorker activation", icon: Globe, envs: ["AKAMAI_CLIENT_TOKEN", "AKAMAI_CLIENT_SECRET", "AKAMAI_ACCESS_TOKEN"] },
  { id: "fastly", name: "Fastly", desc: "Compute / VCL activation", icon: Server, envs: ["FASTLY_API_TOKEN"] },
  { id: "human", name: "HUMAN", desc: "Enforcer companion", icon: ShieldCheck, envs: ["HUMAN_API_KEY"] },
  { id: "datadome", name: "DataDome", desc: "Edge module companion", icon: Shield, envs: ["DATADOME_API_KEY"] },
];

function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-14">
        <h1 className="text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-3 text-muted-foreground">
          Connect provider credentials to move from demo activation to live edge deployment.
        </p>

        <div className="glass mt-8 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="h-4 w-4 text-primary" />
            Demo activation · Provider credentials not connected
          </div>
          <p className="mt-2 text-sm text-foreground/85">
            The end-to-end flow runs in demo mode. Generated WebMCP bundles, manifests, and previews are real outputs. Activation is simulated until you add credentials.
          </p>
        </div>

        <div className="mt-10 grid gap-4">
          {INTEGRATIONS.map((i) => (
            <div key={i.id} className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <i.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold">{i.name}</div>
                  <div className="text-sm text-muted-foreground">{i.desc}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Not connected
                </span>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {i.envs.join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Ready to connect credentials? Auto WebMCP supports Cloudflare, Akamai, Fastly, HUMAN, and DataDome as edge activation targets.
        </p>
      </main>
    </div>
  );
}
