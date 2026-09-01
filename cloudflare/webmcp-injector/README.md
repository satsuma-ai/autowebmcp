# WebMCP edge injector for autowebmcp.com

Serves `/webmcp-tools.js` and appends `<script type="module" src="/webmcp-tools.js"></script>`
to `<head>` on every HTML response with HTMLRewriter. Origin markup is untouched.

Spec: https://developer.chrome.com/docs/ai/webmcp/imperative-api
HTMLRewriter: https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/

## Deploy with Wrangler

```bash
cd cloudflare/webmcp-injector
cp ../../public/webmcp-tools.js src/webmcp-tools.js   # inline the module as an asset
npx wrangler deploy
```

## Deploy from the dashboard

1. Log in at https://dash.cloudflare.com and pick the account holding the `autowebmcp.com` zone.
2. Workers & Pages > Create > Create Worker, name it `webmcp-autowebmcp-com`, Deploy the placeholder.
3. Edit code: paste `src/worker.js`, replacing the `?raw` import with the contents of
   `public/webmcp-tools.js` as a `const TOOLS_SCRIPT = String.raw\`...\`;` string. Deploy.
4. Worker > Settings > Domains & Routes > Add route: `autowebmcp.com/*` (zone `autowebmcp.com`),
   and repeat for `www.autowebmcp.com/*`.
5. Load https://autowebmcp.com in Chrome 146+ and verify in DevTools:

```js
const tools = await document.modelContext.getTools();
console.table(tools.map((t) => t.name));
```

All six tools must be listed with no console errors.

Note: the app itself already serves `/webmcp-tools.js` and loads it from the root
document, so the Worker is only needed when you want the tag injected at the edge
(for example in front of a host that you do not want to redeploy). The Worker
skips injection if the origin HTML already includes the tag.
