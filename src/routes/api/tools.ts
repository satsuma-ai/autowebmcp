import { createFileRoute } from "@tanstack/react-router";

import { getGeneration, json } from "@/lib/generation-store.server";

export const Route = createFileRoute("/api/tools")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("generation_id");
        if (!id) return json({ error: "generation_id is required" }, 400);
        const record = await getGeneration(id);
        if (!record) return json({ error: "Unknown generation_id" }, 404);
        return json({
          generation_id: record.id,
          website_url: record.url,
          tool_count: record.project.tools.length,
          tools: record.project.tools.map((t) => ({
            name: t.name,
            label: t.label,
            description: t.description,
            method: t.method,
            path: t.path,
            type: t.type,
            safety: t.safety,
            read_only: t.method === "GET",
            enabled: t.enabled,
            example_prompt: t.examplePrompt,
          })),
        });
      },
    },
  },
});
