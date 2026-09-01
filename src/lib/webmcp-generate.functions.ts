import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ProjectState, WebMCPTool } from "./store";
import { detectCdn, generateProject, parseDomain, classify } from "./tool-generator";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODELS = ["google/gemini-2.5-flash", "openai/gpt-5-mini"];

const toolSchema = z.object({
  name: z.string(),
  label: z.string(),
  description: z.string(),
  type: z.enum(["form", "navigation", "search", "transaction", "support", "booking", "account", "content"]),
  method: z.enum(["GET", "POST"]),
  path: z.string(),
  safety: z.enum(["safe", "confirmation_required", "sensitive"]),
  examplePrompt: z.string(),
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

const modelOut = z.object({
  siteName: z.string(),
  category: z.string(),
  summary: z.string(),
  primaryGoal: z.string(),
  warnings: z.array(z.string()).default([]),
  tools: z.array(toolSchema).min(4),
});

const SYSTEM = `You are the tool-design engine behind Auto WebMCP. You read real evidence scraped from a live website and design the WebMCP tool set an expert would hand-write for that exact site.

Quality bar (this is the whole job):
- Model the site's REAL core journey, not generic web-form filler. Only include "submit_contact_request" / "subscribe_newsletter" / "search_site" style tools if the evidence shows nothing deeper, and never as the headline tools.
- Example of the bar: for a car manufacturer's configurator the right tools are start_build, get_configurator_entry, filter_configurator_catalog, list_options, search_options, preview_change, apply_change, get_build_summary, estimate_monthly_cost, check_delivery, find_similar_in_stock, save_build — stateful handles (vehicle_id), option dependency previews before applying, typed pricing, availability. For a food-delivery site: search_restaurants, get_store_menu, add_items_to_cart, quote_delivery, place_delivery_order, track_order.
- Design a coherent stateful chain: an entry tool that returns an opaque handle/id, read tools that take that handle, a preview tool before any mutation, and an apply/commit tool. Reuse the same id parameter name across tools.
- 8 to 14 tools. Deep and specific beats broad and shallow.
- Write each description in this two-part shape:
  "Declarative: <what a shopper/user gets, plus what UI it opens>. Imperative: Requires <params>; optional <params>."
- Paths: prefer paths/endpoints actually present in the evidence (api candidates, form actions, link paths). If you must infer, use a plausible same-origin path under the site's real structure and keep it consistent across tools.
- method GET for reads, POST for writes. safety: "safe" for reads, "confirmation_required" for anything that mutates a cart/build/booking, "sensitive" for anything touching personal data, money commitment, or account records.
- names: snake_case verbs. label: short human title. examplePrompt: something a real user would say in the site's own domain language (localized to the site's language when the site is non-English content but keep tool names/schema in English).
- inputSchema properties: snake_case, typed, with a short description each; mark the real required ones.
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

export const generateWebmcpProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ url: z.string().min(3) }).parse(d))
  .handler(async ({ data }): Promise<ProjectState> => {
    const { analyzeSite } = await import("./site-analysis.server");
    const url = data.url.startsWith("http") ? data.url : `https://${data.url}`;
    const { domain, name } = parseDomain(url);

    let evidence: Awaited<ReturnType<typeof analyzeSite>> | null = null;
    try {
      evidence = await analyzeSite(url);
    } catch (e) {
      console.error("[auto-webmcp] crawl failed", e);
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (evidence?.reachable && apiKey) {
      try {
        const raw = await callGateway(
          `Design the WebMCP tool set for this site. Evidence:\n${evidenceBlock(evidence)}`,
          apiKey,
        );
        const parsed = modelOut.parse(parseJson(raw));
        const tools: WebMCPTool[] = parsed.tools.slice(0, 16).map((t, i) => ({
          ...t,
          path: t.path.startsWith("/") ? t.path : `/${t.path.replace(/^https?:\/\/[^/]+/, "")}`,
          confidence: Math.min(0.98, 0.9 - i * 0.005 + (t.method === "GET" ? 0.03 : 0)),
          enabled: true,
          inputSchema: {
            type: "object",
            properties: t.inputSchema.properties,
            required: t.inputSchema.required,
          },
        }));
        const warnings = [...parsed.warnings];
        if (!evidence.forms.length) warnings.push("No server-rendered forms found; endpoints inferred from navigation and client bundles");
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
            formsFound: evidence.forms.length,
            ctasFound: evidence.ctas.length,
            apiCandidates: evidence.apiCandidates.length,
            confidence: 0.93,
            warnings: warnings.slice(0, 4),
          },
          tools,
          detectedCdn: detectCdn(domain),
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
    } else {
      fallback.scan.warnings = [
        evidence?.note ?? "Site could not be fetched; tools generated from domain heuristics",
      ];
    }
    return fallback;
  });
