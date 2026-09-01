import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { createGeneration, json } from "@/lib/generation-store.server";

const bodySchema = z.object({
  website_url: z.string().min(3),
});

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json({ error: "website_url is required" }, 400);
        }
        try {
          const record = await createGeneration(parsed.website_url);
          const p = record.project;
          return json({
            generation_id: record.id,
            status: record.status,
            website_url: record.url,
            domain: p.domain,
            site_name: p.siteName,
            category: p.category,
            summary: p.summary,
            detected_cdn: p.detectedCdn?.providerName,
            platform: p.platform ?? null,
            existing_webmcp: p.existingWebmcp?.present ?? false,
            tool_count: p.tools.length,
            tool_names: p.tools.map((t) => t.name),
            warnings: p.scan.warnings,
          });
        } catch (e) {
          return json({ error: (e as Error).message || "Generation failed" }, 502);
        }
      },
    },
  },
});
