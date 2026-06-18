import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { Nav } from "@/components/Nav";
import { useProject, projectStore } from "@/lib/store";
import { PROVIDERS, ProviderCard, type Provider } from "@/components/ProviderCard";

export const Route = createFileRoute("/activate")({
  component: ActivatePage,
});

const STEPS = [
  "Building WebMCP bundle",
  "Generating provider config",
  "Validating headers and CSP",
  "Preparing edge injection",
  "Running health check",
  "Activation complete",
];

function ActivatePage() {
  const project = useProject();
  const navigate = useNavigate();
  const [active, setActive] = useState<Provider | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!project) navigate({ to: "/" });
  }, [project, navigate]);

  useEffect(() => {
    if (!active) return;
    setStepIdx(0);
    setDone(false);
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setStepIdx(i + 1), (i + 1) * 650));
    });
    timers.push(
      setTimeout(() => {
        setDone(true);
        projectStore.patch({ selectedProvider: active.id, activationStatus: "active" });
      }, STEPS.length * 650 + 200),
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  if (!project) return null;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-14">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Activate Auto WebMCP <span className="gradient-text">at the edge</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          We auto-detected <span className="font-medium text-foreground">{project.detectedCdn.providerName}</span> in {project.domain}'s traffic path — that's the fastest path to activate. No origin rewrite required.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Activating for <span className="font-mono text-foreground/80">{project.domain}</span>
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...PROVIDERS]
            .sort((a, b) => {
              const aRec = a.id === project.detectedCdn.providerId ? -1 : 0;
              const bRec = b.id === project.detectedCdn.providerId ? -1 : 0;
              return aRec - bRec;
            })
            .map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                status={project.selectedProvider === p.id && project.activationStatus === "active" ? "active" : "idle"}
                onActivate={() => setActive(p)}
                busy={!!active && active.id === p.id && !done}
                recommended={p.id === project.detectedCdn.providerId}
                evidence={p.id === project.detectedCdn.providerId ? project.detectedCdn.evidence : undefined}
              />
            ))}
        </div>
      </main>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md p-4">
          <div className="glass-strong relative w-full max-w-lg rounded-2xl p-6">
            <button
              onClick={() => {
                if (done) {
                  setActive(null);
                  navigate({ to: "/success" });
                } else setActive(null);
              }}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: `color-mix(in oklab, ${active.accent} 18%, transparent)`, color: active.accent }}
              >
                <active.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Activating</div>
                <div className="text-base font-semibold">{active.name}</div>
              </div>
            </div>
            <ol className="mt-6 space-y-3">
              {STEPS.map((s, i) => {
                const status = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
                return (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        status === "done"
                          ? "border-success/40 bg-success/15 text-success"
                          : status === "active"
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {status === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span className={status === "pending" ? "text-muted-foreground" : "text-foreground"}>{s}</span>
                  </li>
                );
              })}
            </ol>
            {done && (
              <button
                onClick={() => {
                  setActive(null);
                  navigate({ to: "/success" });
                }}
                className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
