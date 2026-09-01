import type { WebMCPTool } from "./store";

/**
 * Real WebMCP code generation.
 *
 * Current shipping surface (Chrome 146+ origin trial, per
 * https://developer.chrome.com/docs/ai/webmcp/imperative-api):
 *
 *   await document.modelContext.registerTool(
 *     { name, description, inputSchema, execute, annotations },
 *     { signal }
 *   );
 *
 * The original W3C Web Machine Learning CG proposal used
 * `navigator.modelContext` — the polyfill (@mcp-b/webmcp-polyfill) keeps that
 * as a deprecated alias, so generated code registers on `document.modelContext`
 * and falls back to `navigator.modelContext` for older builds.
 */

export const WEBMCP_DOCS = {
  chromeImperative: "https://developer.chrome.com/docs/ai/webmcp/imperative-api",
  openaiWebmcp: "https://learn.chatgpt.com/docs/webmcp",
  cloudflareBlog: "https://blog.cloudflare.com/webmcp/",
  cloudflareBrowserRun: "https://developers.cloudflare.com/browser-run/features/webmcp/",
  cloudflareHtmlRewriter: "https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/",
  akamaiHtmlRewriter: "https://techdocs.akamai.com/edgeworkers/docs/htmlrewriter",
  netlifyHtmlRewriter: "https://edge-functions-examples.netlify.app/example/htmlrewriter",
  nextScript: "https://nextjs.org/docs/app/api-reference/components/script",
  polyfill: "https://www.npmjs.com/package/@mcp-b/webmcp-polyfill",
};

function indent(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((l, i) => (i === 0 ? l : pad + l))
    .join("\n");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function argNames(tool: WebMCPTool): string[] {
  return Object.keys(tool.inputSchema.properties);
}

function destructure(tool: WebMCPTool): string {
  const names = argNames(tool);
  return names.length ? `{ ${names.join(", ")} }` : "_args";
}

/** Path params written as {param} become real interpolations. */
function pathParams(tool: WebMCPTool): string[] {
  return Array.from(tool.path.matchAll(/\{(\w+)\}/g)).map((m) => m[1]);
}

function pathExpr(tool: WebMCPTool): string {
  return tool.path.replace(/\{(\w+)\}/g, (_m, k) => "${encodeURIComponent(String(" + k + "))}");
}

/** The `execute` body — a real fetch against the site's own endpoint. */
function executeBody(tool: WebMCPTool): string {
  const inPath = pathParams(tool);
  const names = argNames(tool).filter((n) => !inPath.includes(n));
  const BT = "`";
  const STATUS = "Request failed with status ${res.status}.";
  if (tool.method === "GET") {
    const entries = names.length
      ? "Object.entries({ " +
        names.join(", ") +
        ' }).flatMap(([k, v]) => (v == null ? [] : [[k, Array.isArray(v) ? v.join(",") : String(v)]]))'
      : "[]";
    const urlLit = BT + pathExpr(tool) + (names.length ? '${query ? "?" + query : ""}' : "") + BT;
    return [
      "const params = new URLSearchParams(" + entries + ");",
      "    const query = params.toString();",
      "    const res = await fetch(" + urlLit + ", {",
      "      signal,",
      '      headers: { accept: "application/json" },',
      "    });",
      "    if (!res.ok) return " + BT + STATUS + BT + ";",
      "    const data = await res.json().catch(() => null);",
      '    return data == null ? "Request succeeded but returned no JSON body." : JSON.stringify(data);',
    ].join("\n");
  }
  const body = names.length ? "{ " + names.join(", ") + " }" : "{}";
  return [
    "const res = await fetch(" + BT + pathExpr(tool) + BT + ", {",
    '      method: "POST",',
    "      signal,",
    '      headers: { "content-type": "application/json", accept: "application/json" },',
    "      body: JSON.stringify(" + body + "),",
    "    });",
    "    if (!res.ok) return " + BT + STATUS + BT + ";",
    "    const data = await res.json().catch(() => ({ ok: true }));",
    "    return JSON.stringify(data);",
  ].join("\n");
}


/** Single-tool snippet shown in the tool detail panel. */
export function toolRegistrationCode(tool: WebMCPTool): string {
  const readOnly = tool.method === "GET";
  const confirm =
    tool.safety === "safe"
      ? ""
      : `
    // ${tool.safety === "sensitive" ? "Sensitive" : "Confirmation-required"} tool: ask the user before committing.
    if (!window.confirm("${esc(tool.label)} — continue?")) return "Cancelled by the user.";
`;
  return `await document.modelContext.registerTool(
  {
    name: "${tool.name}",
    description: "${esc(tool.description)}",
    inputSchema: ${indent(JSON.stringify(tool.inputSchema, null, 2), 4)},
    annotations: {
      readOnlyHint: ${readOnly},
      destructiveHint: ${tool.safety !== "safe"},
      untrustedContentHint: true,
    },
    execute: async (${destructure(tool)}, { signal }) => {${confirm}      ${executeBody(tool)}
    },
  },
  { signal: controller.signal },
);`;
}

/** The full drop-in script served at /webmcp-tools.js */
export function bridgeScript(domain: string, tools: WebMCPTool[]): string {
  const enabled = tools.filter((t) => t.enabled);
  return `/**
 * WebMCP tools for ${domain}
 * Generated by Auto WebMCP by Satsuma.ai
 *
 * Spec: ${WEBMCP_DOCS.chromeImperative}
 * Load with: <script type="module" src="/webmcp-tools.js"></script>
 */

// document.modelContext is the current surface; navigator.modelContext is the
// deprecated alias kept by @mcp-b/webmcp-polyfill and older Chrome builds.
const modelContext =
  ("modelContext" in document && document.modelContext) ||
  ("modelContext" in navigator && navigator.modelContext);

if (!modelContext) {
  console.info("[webmcp] Browser has no WebMCP support — nothing registered.");
} else {
  const controller = new AbortController();
  window.addEventListener("pagehide", () => controller.abort(), { once: true });

  const tools = [
${enabled
  .map((t) => {
    const readOnly = t.method === "GET";
    return `    {
      name: "${t.name}",
      description: "${esc(t.description)}",
      inputSchema: ${indent(JSON.stringify(t.inputSchema, null, 2), 6)},
      annotations: {
        readOnlyHint: ${readOnly},
        destructiveHint: ${t.safety !== "safe"},
        untrustedContentHint: true,
      },
      execute: async (${destructure(t)}, { signal } = {}) => {
${
  t.safety === "safe"
    ? ""
    : `        if (!window.confirm("${esc(t.label)} — continue?")) return "Cancelled by the user.";\n`

}        ${executeBody(t)}
      },
    },`;
  })
  .join("\n")}
  ];

  for (const tool of tools) {
    await modelContext.registerTool(tool, { signal: controller.signal });
  }

  document.modelContext?.addEventListener?.("toolchange", () => {
    console.debug("[webmcp] tool set changed");
  });
}
`;
}

export type DeployTargetId = "vercel" | "netlify" | "cloudflare" | "akamai";

export interface DeployTarget {
  id: DeployTargetId;
  name: string;
  kind: "host" | "edge";
  summary: string;
  docsUrl: string;
  /** Where and how to do it by hand in the provider's own dashboard. */
  dashboard: {
    loginUrl: string;
    loginLabel: string;
    uiSteps: string[];
  };
  steps: string[];
  fileName: string;
  language: string;
  code: (domain: string) => string;
}

export const DEPLOY_TARGETS: DeployTarget[] = [
  {
    id: "vercel",
    name: "Vercel / Next.js",
    kind: "host",
    summary:
      "Serve the generated tools file from /public and load it once from the root layout with next/script.",
    docsUrl: WEBMCP_DOCS.nextScript,
    dashboard: {
      loginUrl: "https://vercel.com/login",
      loginLabel: "vercel.com dashboard",
      uiSteps: [
        "Log in at vercel.com and open the project that serves {domain}.",
        "This one is a code change, not a dashboard toggle: in your repo add public/webmcp-tools.js (download it above) and the <Script> tag from the snippet to app/layout.tsx.",
        "Commit and push — Vercel builds a Preview deployment automatically.",
        "Open the Preview URL, run the DevTools check, then Promote to Production from Deployments.",
        "If you use a strict Content-Security-Policy, allow 'self' for script-src so /webmcp-tools.js can load.",
      ],
    },
    fileName: "app/layout.tsx",
    language: "tsx",
    steps: [
      "Download webmcp-tools.js and drop it into public/webmcp-tools.js.",
      "Add the <Script> tag below to app/layout.tsx (or _document.tsx on the Pages Router).",
      "Deploy — no origin API changes needed; each tool calls your existing endpoints.",
    ],
    code: () => `// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* WebMCP tools — registers document.modelContext tools on load */}
        <Script src="/webmcp-tools.js" type="module" strategy="afterInteractive" />
      </body>
    </html>
  );
}`,
  },
  {
    id: "netlify",
    name: "Netlify Edge Function",
    kind: "edge",
    summary:
      "Inject the tools script at the edge with an HTMLRewriter edge function — no changes to your origin markup.",
    docsUrl: WEBMCP_DOCS.netlifyHtmlRewriter,
    dashboard: {
      loginUrl: "https://app.netlify.com/",
      loginLabel: "app.netlify.com dashboard",
      uiSteps: [
        "Log in at app.netlify.com and select the site serving {domain}.",
        "Add webmcp-tools.js to your published directory (public/ or dist/) and the edge function file to netlify/edge-functions/.",
        "Push the change — Netlify picks up edge functions from the repo; verify under Site configuration > Functions > Edge functions.",
        "Open Deploys > the latest deploy > Preview and confirm the <script> tag is in <head>.",
        "No origin/markup change is needed — the function rewrites HTML on the way out.",
      ],
    },
    fileName: "netlify/edge-functions/inject-webmcp.ts",
    language: "ts",
    steps: [
      "Upload webmcp-tools.js to your site root (public/ or dist/).",
      "Add the edge function below at netlify/edge-functions/inject-webmcp.ts.",
      "Commit and deploy — Netlify rewrites <head> on every HTML response.",
    ],
    code: () => `import type { Config, Context } from "@netlify/edge-functions";
import { HTMLRewriter } from "https://ghuc.cc/worker-tools/html-rewriter/index.ts";

export default async function handler(request: Request, context: Context) {
  const response = await context.next();
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("head", {
      element(el) {
        el.append('<script type="module" src="/webmcp-tools.js"></script>', { html: true });
      },
    })
    .transform(response);
}

export const config: Config = { path: "/*" };`,
  },
  {
    id: "cloudflare",
    name: "Cloudflare Worker",
    kind: "edge",
    summary:
      "A Worker that uses HTMLRewriter to append the tools script and serves it from the same route.",
    docsUrl: WEBMCP_DOCS.cloudflareHtmlRewriter,
    dashboard: {
      loginUrl: "https://dash.cloudflare.com/",
      loginLabel: "dash.cloudflare.com",
      uiSteps: [
        "Log in at dash.cloudflare.com and pick the account holding the {domain} zone.",
        "Go to Workers & Pages > Create > Create Worker, name it webmcp-injector, and Deploy the placeholder.",
        "Open the Worker > Edit code, paste the worker code, inline webmcp-tools.js as the TOOLS_SCRIPT string, and Deploy.",
        "Go to the Worker > Settings > Domains & Routes > Add route, set the route to {domain}/* and select the {domain} zone.",
        "Load {domain} in Chrome and confirm <script type=\"module\" src=\"/webmcp-tools.js\"> is injected in <head>.",
        "Prefer the CLI? Same result with the wrangler.toml at the bottom of the snippet plus `wrangler deploy`.",
      ],
    },
    fileName: "src/worker.ts",
    language: "ts",
    steps: [
      "Create a Worker and paste the code below, with webmcp-tools.js bundled as an asset or inlined.",
      "Add a route for your zone in wrangler.toml, e.g. pattern = \"{domain}/*\".",
      "Run wrangler deploy — tools appear in the page with no origin deploy.",
    ],
    code: (domain) => `// src/worker.ts — inject WebMCP tools at the edge
// Docs: ${WEBMCP_DOCS.cloudflareHtmlRewriter}
import TOOLS_SCRIPT from "./webmcp-tools.js?raw";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Serve the generated tools module from the same origin.
    if (url.pathname === "/webmcp-tools.js") {
      return new Response(TOOLS_SCRIPT, {
        headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=300" },
      });
    }

    const response = await fetch(request);
    if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;

    return new HTMLRewriter()
      .on("head", {
        element(el) {
          el.append('<script type="module" src="/webmcp-tools.js"></script>', { html: true });
        },
      })
      .transform(response);
  },
};

/* wrangler.toml
name = "webmcp-${domain.replace(/[^a-z0-9]+/gi, "-")}"
main = "src/worker.ts"
compatibility_date = "2026-01-01"
routes = [{ pattern = "${domain}/*", zone_name = "${domain}" }]
*/`,
  },
  {
    id: "akamai",
    name: "Akamai EdgeWorker",
    kind: "edge",
    summary:
      "A responseProvider EdgeWorker that streams the origin HTML through HtmlRewritingStream and appends the script.",
    docsUrl: WEBMCP_DOCS.akamaiHtmlRewriter,
    dashboard: {
      loginUrl: "https://control.akamai.com/",
      loginLabel: "Akamai Control Center",
      uiSteps: [
        "Log in to Akamai Control Center and open CDN > EdgeWorkers.",
        "Create an EdgeWorker ID with the 'Dynamic Compute' resource tier, then upload a .tgz containing main.js + bundle.json.",
        "Activate that version on Staging.",
        "In Property Manager, edit the property serving {domain}: add a rule matching HTML responses with the EdgeWorkers behavior pointing at your EdgeWorker ID.",
        "Host webmcp-tools.js on the property (or serve it from the EdgeWorker) and activate the property on Staging, verify, then Production.",
      ],
    },
    fileName: "main.js",
    language: "js",
    steps: [
      "Host webmcp-tools.js on your property (e.g. /webmcp-tools.js).",
      "Bundle main.js + bundle.json and upload as an EdgeWorker version.",
      "Attach the EdgeWorker to an HTML-only property rule and activate.",
    ],
    code: () => `// main.js — Akamai EdgeWorker
// Docs: ${WEBMCP_DOCS.akamaiHtmlRewriter}
import { HtmlRewritingStream } from "html-rewriter";
import { httpRequest } from "http-request";
import { createResponse } from "create-response";

export async function responseProvider(request) {
  const origin = await httpRequest(request.url);
  if (!origin.ok) return createResponse(origin.status, {}, await origin.text());

  const rewriter = new HtmlRewritingStream();
  // HtmlRewritingStream does not escape inserted markup — keep this string static.
  rewriter.onElement("head", (el) => {
    el.append('<script type="module" src="/webmcp-tools.js"></script>');
  });

  return createResponse(200, { "content-type": ["text/html; charset=utf-8"] }, origin.body.pipeThrough(rewriter));
}`,
  },
];

export function manifest(domain: string, tools: WebMCPTool[]) {
  return {
    version: "1.0",
    site: domain,
    api: "document.modelContext.registerTool",
    spec: WEBMCP_DOCS.chromeImperative,
    tools: tools
      .filter((t) => t.enabled)
      .map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: {
          readOnlyHint: t.method === "GET",
          destructiveHint: t.safety !== "safe",
          untrustedContentHint: true,
        },
      })),
  };
}

/**
 * The exact prompt to paste into an AI website builder / coding agent
 * (Lovable, v0, Cursor, Claude Code…) so it implements WebMCP for real.
 */
export function aiBuilderPrompt(domain: string, tools: WebMCPTool[], target: DeployTarget): string {
  const enabled = tools.filter((t) => t.enabled);
  return `Implement WebMCP on ${domain} so AI browser agents can call our site's actions directly.

Spec to follow (do not invent an API): ${WEBMCP_DOCS.chromeImperative}
Registration surface is \`document.modelContext.registerTool({ name, description, inputSchema, execute })\`.
Keep \`navigator.modelContext\` only as a deprecated fallback for older builds.

Deployment target: ${target.name} — ${target.summary}
Reference docs: ${target.docsUrl}

Tasks:
1. Add a module file \`webmcp-tools.js\` (exact contents at the bottom of this message) and serve it from the site root as \`/webmcp-tools.js\`.
2. Load it once on every page with \`<script type="module" src="/webmcp-tools.js"></script>\`${
    target.kind === "edge" ? ` — injected at the edge, per ${target.name}, so the origin markup is untouched.` : " in the root layout/document."
  }
3. Wire each tool's \`execute\` to our real endpoint. Replace any placeholder path below with the actual route, and fix the request/response shape if it differs:
${enabled.map((t) => `   - ${t.name}: ${t.method} ${t.path} (args: ${Object.keys(t.inputSchema.properties).join(", ") || "none"})`).join("\n")}
4. Keep the \`window.confirm\` guard on every non-read-only tool (${
    enabled.filter((t) => t.safety !== "safe").map((t) => t.name).join(", ") || "none in this set"
  }) so agents cannot commit money or data without user consent.
5. Keep \`annotations.readOnlyHint\` / \`destructiveHint\` / \`untrustedContentHint\` accurate for each tool.
6. Do not send cookies or auth tokens to any third-party origin; every fetch must stay same-origin.
7. Verify in Chrome DevTools on ${domain}:
   \`const tools = await document.modelContext.getTools(); console.table(tools.map(t => t.name));\`
   All ${enabled.length} tools must be listed with no console errors.

--- webmcp-tools.js ---
${bridgeScript(domain, tools)}
--- end webmcp-tools.js ---`;
}
