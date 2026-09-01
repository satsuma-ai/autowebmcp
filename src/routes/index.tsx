import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Boxes, Cloud, Code2, Globe, Rocket, Sparkles, Terminal, Zap } from "lucide-react";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { CodeBlock } from "@/components/CodeBlock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Auto WebMCP by Satsuma.ai — Turn any website into an agent-ready website" },
      { name: "description", content: "Paste a URL. Auto WebMCP scans your site, generates real document.modelContext tools, then hands them to your coding agent or to your CDN dashboard." },
    ],
  }),
  component: Landing,
});

const SAMPLE_TOOLS = [
  { name: "search_restaurants", type: "search" },
  { name: "get_store_menu", type: "content" },
  { name: "add_items_to_cart", type: "transaction" },
  { name: "place_delivery_order", type: "transaction" },
  { name: "track_order", type: "account" },
];

const PROVIDERS = [
  { name: "Cloudflare Workers", icon: Cloud },
  { name: "Akamai EdgeWorkers", icon: Globe },
  { name: "Netlify Edge Functions", icon: Zap },
  { name: "Vercel / Next.js", icon: Rocket },
];

function Landing() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (!v) return setError("Enter a URL to scan");
    try {
      const u = new URL(v.startsWith("http") ? v : `https://${v}`);
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      return setError("Use a valid http or https URL");
    }
    setError("");
    navigate({ to: "/scan", search: { url: v.startsWith("http") ? v : `https://${v}` } });
  }

  return (
    <div className="min-h-screen">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Make your website agent-ready in 60 seconds
            </div>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Turn any website into an <span className="gradient-text">agent-ready</span> website.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Paste a URL. Auto WebMCP scans your site, generates real document.modelContext tools, then hands the whole
              thing to your coding agent (Codex, Claude Code, Lovable, v0, Cursor) or gives you exact steps for your CDN
              dashboard.
            </p>

            <form onSubmit={submit} className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <div className="glass-strong flex-1 rounded-xl p-1.5">
                <div className="flex items-center gap-2 px-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <input
                    autoFocus
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-site.com"
                    className="h-11 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="glow inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                Generate WebMCP <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Try:</span>
              {["doordash.com", "calendly.com", "zillow.com"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setUrl(`https://${d}`)}
                  className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline"
                >
                  {d}
                </button>
              ))}
            </div>

          </div>

          {/* HERO VISUAL */}
          <div className="relative mx-auto mt-20 max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-5">
              <BrowserMock />
              <CodeMock />
            </div>
          </div>
        </div>
      </section>

      {/* LIVE SCAN FEED */}
      <LiveScans />

      {/* TRUST STRIP */}
      <section className="border-y border-border/60 bg-card/20 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Works with your existing edge stack
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PROVIDERS.map((p) => (
              <div key={p.name} className="glass flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm text-foreground/80">
                <p.icon className="h-4 w-4 text-primary" /> {p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, title: "LLM-inferred actions", desc: "Auto WebMCP scans your homepage, forms, CTAs and journeys to infer agent-callable tools." },
            { icon: Boxes, title: "Structured tools", desc: "Every tool ships with a JSON Schema, safety class, confidence score, and example agent prompt." },
            { icon: Terminal, title: "Hand it to your coding agent", desc: "Copy one prompt into Codex, Claude Code, Lovable, v0, or Cursor and it wires the tools into your codebase." },
            { icon: Code2, title: "Or ship it at the edge", desc: "Auto-detects your CDN or host, then gives step-by-step dashboard instructions for Cloudflare, Akamai, Netlify, or Vercel." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 text-xs text-muted-foreground sm:flex-row">
          <p>© Satsuma.ai · Auto WebMCP. Agent-ready websites at the edge.</p>
          <p>Generated tools are real document.modelContext registrations. You choose where they ship.</p>
        </div>
      </footer>
    </div>
  );
}

function BrowserMock() {
  return (
    <div className="glass-strong lg:col-span-3 relative overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <div className="ml-3 flex-1 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
          https://your-site.com
        </div>
      </div>
      <div className="relative h-[340px] overflow-hidden p-6">
        <div className="grid-bg absolute inset-0 opacity-30" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/20 to-transparent animate-scan" />
        <div className="relative grid h-full grid-cols-3 gap-3">
          <div className="col-span-2 space-y-3">
            <div className="h-7 w-3/4 rounded-md bg-white/8" />
            <div className="h-4 w-1/2 rounded-md bg-white/5" />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="h-24 rounded-lg bg-white/[0.04] border border-white/5" />
              <div className="h-24 rounded-lg bg-white/[0.04] border border-white/5" />
            </div>
            <div className="h-9 w-32 rounded-md bg-primary/80" />
          </div>
          <div className="relative">
            {SAMPLE_TOOLS.slice(0, 4).map((t, i) => (
              <div
                key={t.name}
                className="glass float-soft absolute right-0 w-full rounded-lg p-2.5 text-[11px]"
                style={{
                  top: i * 56,
                  animationDelay: `${i * 0.6}s`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-foreground/90">{t.name}</span>
                  <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] text-success">safe</span>
                </div>
                <div className="mt-1 text-muted-foreground">{t.type} · agent-callable</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeMock() {
  const code = `document.modelContext.registerTool({
  name: "place_delivery_order",
  description: "Place the current cart as a delivery order",
  inputSchema: {
    type: "object",
    properties: {
      cart_id: { type: "string" },
      address: { type: "string" },
      tip: { type: "number" }
    },
    required: ["cart_id", "address"]
  },
  annotations: { readOnlyHint: false },
  execute: async (input) => {
    const res = await fetch("/api/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      credentials: "same-origin"
    });
    return {
      content: [{ type: "text",
        text: JSON.stringify(await res.json()) }]
    };
  }
});`;
  return (
    <div className="lg:col-span-2">
      <CodeBlock code={code} language="webmcp.ts" />
    </div>
  );
}
