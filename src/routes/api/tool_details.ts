import { createFileRoute } from "@tanstack/react-router";

import { getGeneration, json } from "@/lib/generation-store.server";
import { toolRegistrationCode } from "@/lib/webmcp-codegen";

export const Route = createFileRoute("/api/tool_details")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const id = params.get("generation_id");
        const toolName = params.get("tool_name");
        if (!id || !toolName) return json({ error: "generation_id and tool_name are required" }, 400);
        const record = await getGeneration(id);
        if (!record) return json({ error: "Unknown generation_id" }, 404);
        const tool = record.project.tools.find((t) => t.name === toolName);
        if (!tool)
          return json(
            { error: `Unknown tool_name`, available: record.project.tools.map((t) => t.name) },
            404,
          );
        return json({
          generation_id: record.id,
          tool: {
            name: tool.name,
            label: tool.label,
            description: tool.description,
            method: tool.method,
            path: tool.path,
            type: tool.type,
            safety: tool.safety,
            confidence: tool.confidence,
            input_schema: tool.inputSchema,
            annotations: {
              readOnlyHint: tool.method === "GET",
              destructiveHint: tool.safety !== "safe",
              untrustedContentHint: true,
            },
            example_prompt: tool.examplePrompt,
          },
          registration_code: toolRegistrationCode(tool),
        });
      },
    },
  },
});
