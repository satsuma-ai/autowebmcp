import type { ProjectState } from "./store";
import { buildProject } from "./webmcp-generate.functions";

/**
 * Generation records for the /api/* WebMCP endpoints.
 *
 * The id is self-describing (base64url of the target URL + a short nonce), so a
 * cold isolate that lost the in-memory cache can always rebuild the record from
 * the id alone instead of 404ing an agent mid-conversation.
 */

interface Record_ {
  id: string;
  url: string;
  status: "complete";
  createdAt: number;
  project: ProjectState;
}

const cache = new Map<string, Record_>();
const TTL = 1000 * 60 * 60 * 6;

function b64url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

export function normalizeUrl(raw: string): string {
  const withProto = raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`;
  const u = new URL(withProto);
  return u.origin + (u.pathname === "/" ? "" : u.pathname);
}

function prune() {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.createdAt > TTL) cache.delete(k);
}

export async function createGeneration(rawUrl: string): Promise<Record_> {
  const url = normalizeUrl(rawUrl);
  const project = await buildProject(url);
  const id = `gen_${b64url(url)}`;
  const record: Record_ = { id, url, status: "complete", createdAt: Date.now(), project };
  prune();
  cache.set(id, record);
  return record;
}

/** Resolve an existing generation, rebuilding it if this isolate never saw it. */
export async function getGeneration(id: string): Promise<Record_ | null> {
  prune();
  const hit = cache.get(id);
  if (hit) return hit;
  if (!id.startsWith("gen_")) return null;
  let url: string;
  try {
    url = normalizeUrl(unb64url(id.slice(4)));
  } catch {
    return null;
  }
  try {
    return await createGeneration(url);
  } catch {
    return null;
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
