import { createFileRoute } from "@tanstack/react-router";

import { getGeneration, json } from "@/lib/generation-store.server";
import { DEPLOY_TARGETS, WEBMCP_DOCS, aiBuilderPrompt, bridgeScript, manifest } from "@/lib/webmcp-codegen";

export const Route = createFileRoute("/api/agent_code")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("generation_id");
        if (!id) return json({ error: "generation_id is required" }, 400);
        const record = await getGeneration(id);
        if (!record) return json({ error: "Unknown generation_id" }, 404);
        const { domain, tools } = record.project;
        const target =
          DEPLOY_TARGETS.find((t) => t.id === record.project.detectedCdn?.providerId) ?? DEPLOY_TARGETS[0];
        return json({
          generation_id: record.id,
          domain,
          spec: WEBMCP_DOCS.chromeImperative,
          registration_api: "document.modelContext.registerTool",
          file_name: "webmcp-tools.js",
          load_with: '<script type="module" src="/webmcp-tools.js"></script>',
          module_code: bridgeScript(domain, tools),
          coding_agent_prompt: aiBuilderPrompt(domain, tools, target),
          manifest: manifest(domain, tools),
        });
      },
    },
  },
});
