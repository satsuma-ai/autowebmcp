import type { ProjectState } from "./store";

/**
 * Scan accounting: cost control + the public live feed.
 *
 * Every scan costs one AI Gateway completion plus a crawl, and both the UI and
 * the public /api/generate endpoint are unauthenticated, so the limits below are
 * what stand between us and an agent loop running thousands of scans.
 */

export const LIMITS = {
  perIpPerHour: 6,
  perIpPerDay: 20,
  globalPerHour: 60,
  globalPerDay: 400,
};

export class RateLimitError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Best-effort caller fingerprint from edge headers; hashed before storage. */
export async function fingerprint(headers: Headers): Promise<string> {
  const ip =
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const data = new TextEncoder().encode(`${ip}|auto-webmcp`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function countSince(sinceMs: number, ipHash?: string): Promise<number> {
  const db = await admin();
  const base = db
    .from("scan_throttle")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - sinceMs).toISOString());
  const { count, error } = await (ipHash ? base.eq("ip_hash", ipHash) : base);
  if (error) throw error;
  return count ?? 0;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Throws RateLimitError when the caller (or the whole site) is over budget.
 * Records the attempt so bursts count even when generation later fails.
 */
export async function assertScanAllowed(headers: Headers): Promise<void> {
  const ipHash = await fingerprint(headers);
  try {
    const [ipHour, ipDay, allHour, allDay] = await Promise.all([
      countSince(HOUR, ipHash),
      countSince(DAY, ipHash),
      countSince(HOUR),
      countSince(DAY),
    ]);

    if (ipHour >= LIMITS.perIpPerHour)
      throw new RateLimitError(`Scan limit reached: ${LIMITS.perIpPerHour} scans per hour. Try again shortly.`);
    if (ipDay >= LIMITS.perIpPerDay)
      throw new RateLimitError(`Daily scan limit reached: ${LIMITS.perIpPerDay} scans per day.`);
    if (allHour >= LIMITS.globalPerHour || allDay >= LIMITS.globalPerDay)
      throw new RateLimitError("Auto WebMCP is at capacity right now. Please try again later.");

    const db = await admin();
    await db.from("scan_throttle").insert({ ip_hash: ipHash });
    // Keep the throttle table tiny.
    await db.from("scan_throttle").delete().lt("created_at", new Date(Date.now() - 2 * DAY).toISOString());
  } catch (e) {
    if (e instanceof RateLimitError) throw e;
    // Never let accounting infrastructure break a legitimate scan.
    console.error("[auto-webmcp] rate-limit check failed", e);
  }
}

/** Public feed row. Never stores the URL query string or any caller identity. */
export async function logScan(project: ProjectState, source: "ui" | "api"): Promise<void> {
  try {
    const db = await admin();
    await db.from("scan_events").insert({
      domain: project.domain,
      site_name: project.siteName ?? null,
      category: project.category ?? null,
      tool_count: project.tools.length,
      source,
    });
  } catch (e) {
    console.error("[auto-webmcp] scan log failed", e);
  }
}
