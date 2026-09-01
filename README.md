# Auto WebMCP by Satsuma.ai

Auto WebMCP scans any website, generates a real [WebMCP](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
tools module for it, and gives you the exact steps (or the exact AI-agent prompt) to ship it
from your host or CDN edge.

Live site: https://autowebmcp.com

## WebMCP on this site

This site registers its own WebMCP tools, so an AI browser agent can drive it directly.

- `public/webmcp-tools.js` — the module served at `/webmcp-tools.js`. It registers six tools with
  `document.modelContext.registerTool(tool, { signal })`, keeping `navigator.modelContext` only as a
  deprecated fallback, and aborts registration on `pagehide`.
- `src/routes/__root.tsx` — loads the module once per page with
  `<script type="module" src="/webmcp-tools.js"></script>`.
- `cloudflare/webmcp-injector/` — a Cloudflare Worker that serves `/webmcp-tools.js` and uses
  `HTMLRewriter` to append the script tag at the edge, leaving origin markup untouched.

Registered tools: `generate_webmcp_tools`, `get_generation_status`, `list_generated_tools`,
`get_tool_details`, `get_agent_code_snippet`, `get_cdn_deployment_instructions`.

Verify in Chrome DevTools on the live site:

```js
const tools = await document.modelContext.getTools();
console.table(tools.map((t) => t.name));
```

## Public HTTP API

All endpoints are same-origin JSON:

| Endpoint | Description |
| --- | --- |
| `POST /api/generate` | `{ website_url }` → starts a generation, returns `generation_id` |
| `GET /api/status?generation_id=` | generation progress |
| `GET /api/tools?generation_id=` | generated tool list |
| `GET /api/tool_details?generation_id=&tool_name=` | full schema for one tool |
| `GET /api/agent_code?generation_id=` | copy-paste snippet for coding agents |
| `GET /api/cdn_deploy?generation_id=&cdn_platform=` | deployment steps for a host/CDN |

## Stack

TanStack Start (React 19, Vite 7), Tailwind CSS v4, server functions for the analysis and
generation pipeline, deployed on Cloudflare.


## License

MIT — see [LICENSE](./LICENSE).
