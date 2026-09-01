/**
 * Real site crawl + evidence extraction, used to ground WebMCP tool generation.
 * Server-only: runs inside a server function handler.
 */

export interface FormEvidence {
  action: string;
  method: string;
  fields: { name: string; type: string; required: boolean }[];
  nearbyText: string;
}

export interface ExistingWebmcp {
  present: boolean;
  /** "webmcp" = in-page document.modelContext tools, "mcp-server" = remote MCP endpoint only */
  kind: "none" | "webmcp" | "mcp-server";
  platform?: string;
  signals: string[];
  endpoints: string[];
  toolNames: string[];
  confidence: number;
  note?: string;
}

export interface SiteEvidence {
  url: string;
  domain: string;
  title: string;
  description: string;
  lang: string;
  pagesFetched: string[];
  jsonLdTypes: string[];
  forms: FormEvidence[];
  navLinks: { href: string; text: string }[];
  ctas: string[];
  apiCandidates: string[];
  searchParams: string[];
  headings: string[];
  bodyText: string;
  headers: Record<string, string>;
  platform?: string;
  existingWebmcp: ExistingWebmcp;
  reachable: boolean;
  note?: string;
}

const NO_WEBMCP: ExistingWebmcp = {
  present: false,
  kind: "none",
  signals: [],
  endpoints: [],
  toolNames: [],
  confidence: 0,
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

function abs(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function text(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return (m?.[2] ?? m?.[3] ?? m?.[4] ?? "").trim();
}

function parseForms(html: string, base: string): FormEvidence[] {
  const out: FormEvidence[] = [];
  const re = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 12) {
    const open = m[1];
    const inner = m[2];
    const action = attr(`<f ${open}>`, "action");
    const method = (attr(`<f ${open}>`, "method") || "get").toUpperCase();
    const fields: FormEvidence["fields"] = [];
    const fre = /<(input|select|textarea)\b([^>]*)>/gi;
    let f: RegExpExecArray | null;
    while ((f = fre.exec(inner))) {
      const tag = `<x ${f[2]}>`;
      const name = attr(tag, "name") || attr(tag, "id");
      const type = (attr(tag, "type") || (f[1] === "input" ? "text" : f[1])).toLowerCase();
      if (!name || type === "hidden" || type === "submit" || type === "button") continue;
      if (fields.some((x) => x.name === name)) continue;
      fields.push({ name, type, required: /\brequired\b/i.test(f[2]) });
    }
    if (!fields.length) continue;
    out.push({
      action: action ? abs(action, base) : base,
      method,
      fields: fields.slice(0, 12),
      nearbyText: text(inner).slice(0, 220),
    });
  }
  return out;
}

function uniq(arr: string[], limit: number): string[] {
  return Array.from(new Set(arr.filter(Boolean))).slice(0, limit);
}

async function get(url: string, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    });
    const body = res.ok ? await res.text() : "";
    return { res, body };
  } finally {
    clearTimeout(t);
  }
}

const INTERESTING =
  /(search|shop|product|catalog|configur|build|konfigurator|menu|order|cart|book|reserv|appointment|contact|kontakt|quote|pricing|preis|demo|signup|login|account|stock|inventory|finance|leasing|lease|test-?drive|probefahrt|dealer|haendler|händler|support|help)/i;

export async function analyzeSite(rawUrl: string): Promise<SiteEvidence> {
  const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const domain = new URL(url).hostname.replace(/^www\./, "");
  const empty: SiteEvidence = {
    url,
    domain,
    title: "",
    description: "",
    lang: "",
    pagesFetched: [],
    jsonLdTypes: [],
    forms: [],
    navLinks: [],
    ctas: [],
    apiCandidates: [],
    searchParams: [],
    headings: [],
    bodyText: "",
    headers: {},
    reachable: false,
  };

  let home: { res: Response; body: string };
  try {
    home = await get(url);
  } catch (e) {
    return { ...empty, note: `Homepage fetch failed: ${(e as Error).message}` };
  }
  if (!home.body) return { ...empty, note: `Homepage returned HTTP ${home.res.status}` };

  const headers: Record<string, string> = {};
  for (const k of ["server", "cf-ray", "x-akamai-transformed", "x-vercel-id", "x-nf-request-id", "via", "x-powered-by", "content-language"]) {
    const v = home.res.headers.get(k);
    if (v) headers[k] = v;
  }

  const pages: { url: string; html: string }[] = [{ url, html: home.body }];

  // Follow up to 4 high-signal internal links.
  const linkRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  const links: { href: string; text: string }[] = [];
  let lm: RegExpExecArray | null;
  while ((lm = linkRe.exec(home.body)) && links.length < 400) {
    const href = abs(attr(`<a ${lm[1]}>`, "href"), url);
    const label = text(lm[2]).slice(0, 60);
    if (!href.startsWith("http")) continue;
    if (new URL(href).hostname.replace(/^www\./, "") !== domain) continue;
    links.push({ href: href.split("#")[0], text: label });
  }
  const candidates = uniq(
    links.filter((l) => INTERESTING.test(l.href) || INTERESTING.test(l.text)).map((l) => l.href),
    4,
  );
  await Promise.all(
    candidates.map(async (c) => {
      try {
        const r = await get(c, 12000);
        if (r.body) pages.push({ url: c, html: r.body });
      } catch {
        /* ignore */
      }
    }),
  );

  const allHtml = pages.map((p) => p.html).join("\n");

  const jsonLdTypes: string[] = [];
  for (const m of allHtml.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const walk = (n: unknown) => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === "object") {
          const t = (n as Record<string, unknown>)["@type"];
          if (typeof t === "string") jsonLdTypes.push(t);
          if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && jsonLdTypes.push(x));
          Object.values(n as Record<string, unknown>).forEach(walk);
        }
      };
      walk(parsed);
    } catch {
      /* ignore */
    }
  }

  const forms = pages.flatMap((p) => parseForms(p.html, p.url)).slice(0, 12);

  const ctas = uniq(
    Array.from(allHtml.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi))
      .map((m) => text(m[1]))
      .filter((t) => t.length > 1 && t.length < 40),
    24,
  );

  const apiCandidates = uniq(
    Array.from(allHtml.matchAll(/["'`](\/(?:api|graphql|_next\/data|rest|v\d)[^"'`\s]{0,80})["'`]/gi)).map((m) => m[1]),
    24,
  );

  const searchParams = uniq(
    Array.from(allHtml.matchAll(/[?&]((?:q|query|search|s|keyword|suchbegriff)=)/gi)).map((m) => m[1].replace("=", "")),
    6,
  );

  const headings = uniq(
    Array.from(allHtml.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi))
      .map((m) => text(m[1]))
      .filter((t) => t.length > 2 && t.length < 120),
    20,
  );

  const navLinks = uniq(links.map((l) => `${l.text || "(no text)"} :: ${new URL(l.href).pathname}`), 60).map((s) => {
    const [t, p] = s.split(" :: ");
    return { text: t, href: p };
  });

  return {
    url,
    domain,
    title: text(home.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    description: attr(home.body.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] ?? "", "content"),
    lang: attr(home.body.match(/<html\b[^>]*>/i)?.[0] ?? "", "lang"),
    pagesFetched: pages.map((p) => p.url),
    jsonLdTypes: uniq(jsonLdTypes, 20),
    forms,
    navLinks,
    ctas,
    apiCandidates,
    searchParams,
    headings,
    bodyText: text(pages[0].html).slice(0, 6000),
    headers,
    reachable: true,
  };
}
