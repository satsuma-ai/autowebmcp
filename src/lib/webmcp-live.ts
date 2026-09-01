/**
 * Live WebMCP tools for this app itself.
 *
 * Uses the current shipping surface, document.modelContext.registerTool
 * (https://developer.chrome.com/docs/ai/webmcp/imperative-api), falling back to
 * the deprecated navigator.modelContext alias on older builds.
 */
import { projectStore } from "./store";
import { bridgeScript, manifest, DEPLOY_TARGETS } from "./webmcp-codegen";

interface ModelContextLike {
  registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => Promise<unknown> | unknown;
}

function getModelContext(): ModelContextLike | null {
  const d = document as unknown as { modelContext?: ModelContextLike };
  const n = navigator as unknown as { modelContext?: ModelContextLike };
  return d.modelContext ?? n.modelContext ?? null;
}

export function isWebMCPAvailable(): boolean {
  return typeof document !== "undefined" && getModelContext() !== null;
}

/** Registers this app's own tools. Returns a cleanup function. */
export function registerAppTools(navigateTo: (path: string) => void): () => void {
  const mc = getModelContext();
  if (!mc) return () => {};

  const controller = new AbortController();

  const tools = [
    {
      name: "scan_website",
      description:
        "Scan a website with Auto WebMCP and generate WebMCP tools for it. Accepts a domain or full URL.",
      inputSchema: {
        type: "object",
        properties: { url: { type: "string", description: "Domain or URL, e.g. shop.example.com" } },
        required: ["url"],
      },
      annotations: { readOnlyHint: false, destructiveHint: false, untrustedContentHint: true },
      execute: async ({ url }: { url: string }) => {
        navigateTo(`/scan?url=${encodeURIComponent(url)}`);
        return `Scanning ${url}. Generated tools will appear on the results page in a few seconds.`;
      },
    },
    {
      name: "list_generated_tools",
      description: "List the WebMCP tools Auto WebMCP generated for the site in the current session.",
      inputSchema: { type: "object", properties: {}, required: [] },
      annotations: { readOnlyHint: true, destructiveHint: false, untrustedContentHint: true },
      execute: async () => {
        const p = projectStore.get();
        if (!p) return "No site has been scanned yet. Call scan_website first.";
        return JSON.stringify(manifest(p.domain, p.tools));
      },
    },
    {
      name: "get_webmcp_module",
      description:
        "Return the generated webmcp-tools.js module for the scanned site — real document.modelContext.registerTool code.",
      inputSchema: { type: "object", properties: {}, required: [] },
      annotations: { readOnlyHint: true, destructiveHint: false, untrustedContentHint: true },
      execute: async () => {
        const p = projectStore.get();
        if (!p) return "No site has been scanned yet. Call scan_website first.";
        return bridgeScript(p.domain, p.tools);
      },
    },
    {
      name: "get_deployment_instructions",
      description:
        "Get deployment instructions and code for shipping the generated WebMCP tools on a given target.",
      inputSchema: {
        type: "object",
        properties: {
          target: { type: "string", enum: DEPLOY_TARGETS.map((t) => t.id) },
        },
        required: ["target"],
      },
      annotations: { readOnlyHint: true, destructiveHint: false, untrustedContentHint: true },
      execute: async ({ target }: { target: string }) => {
        const t = DEPLOY_TARGETS.find((x) => x.id === target);
        if (!t) return `Unknown target. Choose one of: ${DEPLOY_TARGETS.map((x) => x.id).join(", ")}.`;
        const domain = projectStore.get()?.domain ?? "example.com";
        return JSON.stringify({
          target: t.name,
          docs: t.docsUrl,
          steps: t.steps,
          file: t.fileName,
          code: t.code(domain),
        });
      },
    },
  ];

  void (async () => {
    for (const tool of tools) {
      try {
        await mc.registerTool(tool, { signal: controller.signal });
      } catch (err) {
        console.warn("[webmcp] failed to register", (tool as { name: string }).name, err);
      }
    }
  })();

  return () => controller.abort();
}
