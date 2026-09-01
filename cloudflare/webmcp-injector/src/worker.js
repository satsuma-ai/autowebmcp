/**
 * Cloudflare Worker — injects WebMCP tools into autowebmcp.com at the edge.
 *
 * Docs: https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/
 *
 * - Serves /webmcp-tools.js from the same origin (inlined at build time).
 * - Appends <script type="module" src="/webmcp-tools.js"></script> to <head>
 *   once on every HTML response. Origin markup is untouched.
 */
import TOOLS_SCRIPT from "./webmcp-tools.js?raw";

const TAG = '<script type="module" src="/webmcp-tools.js"></script>';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/webmcp-tools.js") {
      return new Response(TOOLS_SCRIPT, {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

    const response = await fetch(request);
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html")) return response;

    let injected = false;
    return new HTMLRewriter()
      .on("script[src='/webmcp-tools.js']", {
        element() {
          // Origin already loads the module — do not add a second copy.
          injected = true;
        },
      })
      .on("head", {
        element(el) {
          if (!injected) {
            el.append(TAG, { html: true });
            injected = true;
          }
        },
      })
      .transform(response);
  },
};
