import { createFileRoute } from "@tanstack/react-router";

import { getGeneration, json } from "@/lib/generation-store.server";
import { DEPLOY_TARGETS, bridgeScript } from "@/lib/webmcp-codegen";

function matchTarget(input: string) {
  const q = input.toLowerCase();
  return (
    DEPLOY_TARGETS.find((t) => q.includes(t.id)) ??
    DEPLOY_TARGETS.find((t) => t.name.toLowerCase().includes(q) || q.includes(t.name.toLowerCase())) ??
    (/(next|vercel)/.test(q) ? DEPLOY_TARGETS.find((t) => t.id === "vercel") : undefined) ??
    (/(worker|cloudflare|cf)/.test(q) ? DEPLOY_TARGETS.find((t) => t.id === "cloudflare") : undefined) ??
    (/netlify/.test(q) ? DEPLOY_TARGETS.find((t) => t.id === "netlify") : undefined) ??
    (/(akamai|edgeworker)/.test(q) ? DEPLOY_TARGETS.find((t) => t.id === "akamai") : undefined)
  );
}

export const Route = createFileRoute("/api/cdn_deploy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const id = params.get("generation_id");
        const platform = params.get("cdn_platform");
        if (!id || !platform)
          return json({ error: "generation_id and cdn_platform are required" }, 400);
        const record = await getGeneration(id);
        if (!record) return json({ error: "Unknown generation_id" }, 404);
        const target = matchTarget(platform);
        if (!target)
          return json(
            {
              error: "Unsupported cdn_platform",
              supported: DEPLOY_TARGETS.map((t) => t.name),
            },
            400,
          );
        const { domain, tools } = record.project;
        return json({
          generation_id: record.id,
          domain,
          platform: target.name,
          kind: target.kind,
          summary: target.summary,
          docs_url: target.docsUrl,
          dashboard: {
            login_url: target.dashboard.loginUrl,
            login_label: target.dashboard.loginLabel,
            ui_steps: target.dashboard.uiSteps.map((s) => s.replaceAll("{domain}", domain)),
          },
          code_steps: target.steps.map((s) => s.replaceAll("{domain}", domain)),
          file_name: target.fileName,
          language: target.language,
          code: target.code(domain),
          tools_module_file: "webmcp-tools.js",
          tools_module_code: bridgeScript(domain, tools),
        });
      },
    },
  },
});
