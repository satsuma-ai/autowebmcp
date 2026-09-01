import { createFileRoute } from "@tanstack/react-router";

import { getGeneration, json } from "@/lib/generation-store.server";

export const Route = createFileRoute("/api/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("generation_id");
        if (!id) return json({ error: "generation_id is required" }, 400);
        const record = await getGeneration(id);
        if (!record) return json({ error: "Unknown generation_id" }, 404);
        return json({
          generation_id: record.id,
          status: record.status,
          progress: 100,
          website_url: record.url,
          site_name: record.project.siteName,
          category: record.project.category,
          tool_count: record.project.tools.length,
          warnings: record.project.scan.warnings,
          created_at: new Date(record.createdAt).toISOString(),
        });
      },
    },
  },
});
