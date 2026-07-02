// Lightweight distributed rate limiter backed by the Upstash Redis REST API.
// No extra dependency (plain fetch). Activates ONLY when both env vars are set,
// so the app works in dev / before provisioning — set to enable:
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// Free tier is plenty for this traffic.

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function isRateLimitConfigured(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(REST_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("upstash");
  const data = (await res.json()) as { result?: unknown };
  return data.result;
}

export type RateResult = { ok: boolean; remaining: number };

// Fixed-window limiter: at most `limit` hits per `windowSec` for `key`.
// - No-op (always ok) when Upstash isn't configured.
// - Fail-open on limiter errors: never block a legit user if Redis hiccups.
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  if (!isRateLimitConfigured()) return { ok: true, remaining: limit };
  try {
    const bucket = `rl:${key}`;
    const count = (await redis(["INCR", bucket])) as number;
    if (count === 1) await redis(["EXPIRE", bucket, windowSec]);
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { ok: true, remaining: limit };
  }
}

// Best-effort client IP from the proxy headers Vercel sets.
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
