import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ProjectState, WebMCPTool } from "./store";
import { detectCdn, generateProject, parseDomain, classify } from "./tool-generator";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "openai/gpt-5-mini"];

const toolSchema = z.object({
  name: z.string(),
  label: z.string(),
  description: z.string(),
  type: z.string().optional(),
  method: z.string().optional(),
  path: z.string(),
  safety: z.string().optional(),
  examplePrompt: z.string().optional(),
  inputSchema: z.object({
    type: z.literal("object").default("object"),
    properties: z.record(
      z.object({
        type: z.string(),
        description: z.string().optional(),
        format: z.string().optional(),
        enum: z.array(z.string()).optional(),
      }),
    ),
    required: z.array(z.string()).default([]),
  }),
});

const TYPES = ["form", "navigation", "search", "transaction", "support", "booking", "account", "content"] as const;
type ToolType = (typeof TYPES)[number];

function coerceType(v: string | undefined, method: string): ToolType {
  const t = (v ?? "").toLowerCase();
  if ((TYPES as readonly string[]).includes(t)) return t as ToolType;
  if (/search|find|list|query/.test(t)) return "search";
  if (/book|reserv|appoint/.test(t)) return "booking";
  if (/order|cart|checkout|pay|commit/.test(t)) return "transaction";
  if (/support|help|ticket/.test(t)) return "support";
  if (/account|profile|save/.test(t)) return "account";
  if (/form|contact|submit/.test(t)) return "form";
  return method === "POST" ? "form" : "content";
}

function coerceSafety(v: string | undefined, method: string): "safe" | "confirmation_required" | "sensitive" {
  const s = (v ?? "").toLowerCase();
  if (s.includes("sensitive")) return "sensitive";
  if (s.includes("confirm") || s.includes("destructive")) return "confirmation_required";
  if (s.includes("safe") || s.includes("read")) return "safe";
  return method === "POST" ? "confirmation_required" : "safe";
}

const modelOut = z.object({
  siteName: z.string(),
  category: z.string(),
  summary: z.string(),
  primaryGoal: z.string(),
  warnings: z.array(z.string()).default([]),
  tools: z.array(toolSchema).min(6),
});

const SYSTEM = `You are the tool-design engine behind Auto WebMCP. You read real evidence scraped from a live website and design the WebMCP tool set an expert would hand-write for that exact site.

Quality bar (this is the whole job):
- FIRST decide what the site actually is from the evidence (title, headings, nav, visible text, forms, platform). Design tools for THAT business. The examples below are illustrations of depth, never vocabulary to transplant: never emit configurator/vehicle/build tools unless the site really sells or configures vehicles, never emit cart/checkout tools unless it really sells goods, never emit menu/delivery tools unless it really sells food.
- Model the site's REAL core journey, not generic web-form filler. Only include "submit_contact_request" / "subscribe_newsletter" / "search_site" style tools if the evidence shows nothing deeper, and never as the headline tools.
- Depth example (automotive ONLY): start_build, list_options, preview_change, apply_change, get_build_summary — stateful handles, dependency previews before applying, typed pricing. Depth example (food delivery ONLY): search_restaurants, get_store_menu, add_items_to_cart, quote_delivery, place_delivery_order, track_order. Copy the *shape* (entry -> read -> preview -> commit -> summary), not the nouns.
- Software / developer-tool / SaaS / internal-app sites (dashboards, generators, analytics, docs, agent tooling) are a first-class case: design tools around the product's own workflow that a user performs in the app — e.g. run the product's primary action with its real inputs, read the resulting artifact or report, list/inspect generated items, change configuration, export or download output, copy an install snippet, plus docs/pricing lookups and account/support actions where evidence shows them. Use the app's own domain nouns from the evidence.
- Commerce is a first-class case, and it covers ALL retail shapes: big-box and department stores, single-brand DTC, fashion and beauty, grocery and supermarkets, convenience and quick-commerce, pharmacy, home improvement, pet and hobby, B2B/wholesale, and peer-to-peer or multi-seller marketplaces. For any of them the bar is the full shopping journey, never just "search_products" plus a contact form: list_departments/categories, search_products (facets: category, price range, brand, size/variant, rating, in-stock, sort, page), get_product, list_product_variants, check_availability (ship AND store pickup / local delivery when the site has stores), compare_products, get_cart, add_to_cart (variant_id + quantity + fulfillment), update_cart_item (quantity 0 removes), apply_promo_code or loyalty code, quote_order_total (shipping options, delivery estimate, tax, discounts, final total), start_checkout (returns the hosted checkout URL — never collect card data in a tool), track_order, start_return/exchange. Grocery and convenience sites additionally want slot/window booking (list_delivery_slots, reserve_delivery_slot), substitutions preferences, and reorder/basket-from-list tools (add_shopping_list_to_cart, reorder_previous_order). Multi-seller marketplaces additionally want get_seller_profile, quote_shipping, message_seller, make_offer, watch_listing, save_search_alert, and a seller-side create_listing_draft when the site clearly supports selling.
- Commerce safety: reads are "safe"; cart and promo mutations are "confirmation_required"; checkout, offers, orders, returns, and anything touching an account, address, or money commitment is "sensitive". Never design a tool that takes card numbers, CVV, or full payment credentials — hand off to the site's own checkout URL. Prices always come back as amount + currency from the site, never assumed to be USD.
- Choose the category honestly: "ecommerce" for first-party retail (including grocery, convenience, pharmacy, DTC, wholesale), "marketplace" for multi-seller/peer-to-peer, "food_delivery" for prepared-food delivery platforms, "saas" for software products and web apps.


- Design a coherent stateful chain: an entry tool that returns an opaque handle/id, read tools that take that handle, a preview tool before any mutation, and an apply/commit tool. Reuse the same id parameter name across tools.
- 10 to 14 tools. Deep and specific beats broad and shallow. Every set must include, where the domain allows: an entry/catalogue tool, a detail/read tool keyed by handle, an option/variant listing tool, a natural-language search tool over those options, a preview-before-mutate tool, a commit/apply tool, a summary tool, a pricing/cost or quote tool, an availability/delivery/stock tool, and a save-or-share tool.
- Write each description in this two-part shape:
  "Declarative: <what a shopper/user gets, plus what UI it opens>. Imperative: Requires <params>; optional <params>."
- Paths: prefer paths/endpoints actually present in the evidence (api candidates, form actions, link paths). If you must infer, use a plausible same-origin path under the site's real structure and keep it consistent across tools.
- method GET for reads, POST for writes. safety: "safe" for reads, "confirmation_required" for anything that mutates a cart/build/booking, "sensitive" for anything touching personal data, money commitment, or account records.
- names: snake_case verbs. label: short human title. examplePrompt: something a real user would say in the site's own domain language (localized to the site's language when the site is non-English content but keep tool names/schema in English).
- inputSchema properties: snake_case, typed, with a short description each; mark the real required ones.
- Evidence may be sparse or empty (large sites block server-side crawlers). In that case rely on your own knowledge of this specific brand, domain, and its real product journeys and URL structure. NEVER fall back to a generic contact/newsletter/site-search set for a site whose business you can recognise from its domain.
- If evidence.existingAgentTooling shows the site already exposes agent tooling (in-page WebMCP tools, or a remote MCP server such as Shopify's /api/mcp), treat its toolNames as the baseline: keep equivalents, reuse their naming, and design the tools it is MISSING so the set is a strict superset. Say so in summary.
- Never invent third-party origins, tracking, or auth-token exfiltration. Everything must be same-origin.

Return ONLY minified JSON matching:
{"siteName":string,"category":"food_delivery|ecommerce|restaurant|saas|healthcare|real_estate|marketplace|media|nonprofit|automotive|travel|finance|education|generic","summary":string,"primaryGoal":string,"warnings":string[],"tools":[{"name","label","description","type","method","path","safety","examplePrompt","inputSchema":{"type":"object","properties":{...},"required":[...]}}]}`;

function evidenceBlock(e: Awaited<ReturnType<typeof import("./site-analysis.server").analyzeSite>>) {
  return JSON.stringify(
    {
      url: e.url,
      domain: e.domain,
      title: e.title,
      description: e.description,
      lang: e.lang,
      pagesFetched: e.pagesFetched,
      structuredDataTypes: e.jsonLdTypes,
      headings: e.headings,
      navPaths: e.navLinks.slice(0, 45),
      buttons: e.ctas,
      forms: e.forms,
      apiCandidates: e.apiCandidates,
      searchQueryParams: e.searchParams,
      responseHeaders: e.headers,
      platform: e.platform,
      existingAgentTooling: e.existingWebmcp,
      visibleText: e.bodyText.slice(0, 3500),
    },
    null,
    0,
  );
}

async function callGateway(prompt: string, apiKey: string): Promise<string> {
  let lastErr = "";
  for (const model of MODELS) {
    try {
      const res = await fetch(GATEWAY, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        lastErr = `${model}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`;
        continue;
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (content) return content;
      lastErr = `${model}: empty completion`;
    } catch (e) {
      lastErr = `${model}: ${(e as Error).message}`;
    }
  }
  throw new Error(lastErr || "AI gateway unavailable");
}

function parseJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Model did not return JSON");
  }
}

/** Core generator, shared by the client server-fn and the /api/* routes. */
export async function buildProject(rawUrl: string): Promise<ProjectState> {
  {
    const { analyzeSite } = await import("./site-analysis.server");
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    const { domain, name } = parseDomain(url);

    let evidence: Awaited<ReturnType<typeof analyzeSite>> | null = null;
    try {
      evidence = await analyzeSite(url);
    } catch (e) {
      console.error("[auto-webmcp] crawl failed", e);
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (apiKey) {
      try {
        const crawlNote = evidence?.reachable
          ? "Crawl succeeded; prefer paths visible in the evidence."
          : `Crawl blocked or failed (${evidence?.note ?? "no response"}). Use your own knowledge of ${domain} and its real user journeys, and infer plausible same-origin paths.`;
        const raw = await callGateway(
          `Site: ${url}\nCrawl status: ${crawlNote}\n\nEvidence:\n${evidence ? evidenceBlock(evidence) : "{}"}`,
          apiKey,
        );
        const parsed = modelOut.parse(parseJson(raw));
        const tools: WebMCPTool[] = parsed.tools.slice(0, 16).map((t, i) => {
          const method = (t.method ?? "").toUpperCase() === "POST" ? "POST" : "GET";
          return {
          ...t,
          method,
          type: coerceType(t.type, method),
          safety: coerceSafety(t.safety, method),
          examplePrompt: t.examplePrompt ?? t.label,
          path: t.path.startsWith("/") ? t.path : `/${t.path.replace(/^https?:\/\/[^/]+/, "")}`,
          confidence: Math.min(0.98, 0.9 - i * 0.005 + (method === "GET" ? 0.03 : 0)),
          enabled: true,
          inputSchema: {
            type: "object" as const,
            properties: t.inputSchema.properties,
            required: t.inputSchema.required,
          },
          };
        });
        const warnings = [...parsed.warnings];
        if (evidence?.existingWebmcp.kind === "webmcp")
          warnings.push("Site already registers in-page WebMCP tools — review overlap before shipping this set");
        if (!evidence?.reachable) warnings.push("Site blocked server-side crawling; tools derived from domain knowledge — verify each endpoint path");
        else if (!evidence.forms.length) warnings.push("No server-rendered forms found; endpoints inferred from navigation and client bundles");
        return {
          url,
          domain,
          siteName: parsed.siteName || name,
          category: (["food_delivery", "ecommerce", "restaurant", "saas", "healthcare", "real_estate", "marketplace", "media", "nonprofit", "automotive", "travel"].includes(parsed.category)
            ? parsed.category
            : "generic") as ProjectState["category"],
          summary: parsed.summary,
          primaryGoal: parsed.primaryGoal,
          scan: {
            formsFound: evidence?.forms.length ?? 0,
            ctasFound: evidence?.ctas.length ?? 0,
            apiCandidates: evidence?.apiCandidates.length ?? tools.length,
            confidence: evidence?.reachable ? 0.93 : 0.84,
            warnings: warnings.slice(0, 4),
          },
          tools,
          detectedCdn: detectCdn(domain),
          platform: evidence?.platform,
          existingWebmcp: evidence?.existingWebmcp,
          activationStatus: "idle",
          createdAt: Date.now(),
        };
      } catch (e) {
        console.error("[auto-webmcp] AI generation failed", e);
      }
    }

    // Deterministic fallback, still enriched with anything the crawl found.
    const fallback = generateProject(url);
    if (evidence?.reachable) {
      fallback.siteName = evidence.title ? evidence.title.split(/[|\-–—]/)[0].trim().slice(0, 40) || name : name;
      if (evidence.description) fallback.summary = evidence.description.slice(0, 240);
      fallback.scan = {
        formsFound: evidence.forms.length,
        ctasFound: evidence.ctas.length,
        apiCandidates: evidence.apiCandidates.length,
        confidence: 0.82,
        warnings: ["Generated from structural heuristics; deep journey analysis unavailable for this site"],
      };
      fallback.category = classify(evidence.domain);
      fallback.platform = evidence.platform;
      fallback.existingWebmcp = evidence.existingWebmcp;
    } else {
      fallback.scan.warnings = [
        evidence?.note ?? "Site could not be fetched; tools generated from domain heuristics",
      ];
    }
    return fallback;
  }
}

export const generateWebmcpProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ url: z.string().min(3) }).parse(d))
  .handler(async ({ data }): Promise<ProjectState> => buildProject(data.url));
