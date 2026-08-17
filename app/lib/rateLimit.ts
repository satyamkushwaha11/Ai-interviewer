/**
 * Fixed-window rate limiter, in process memory.
 *
 * This is a first line of defence against credential stuffing and API-credit
 * abuse, not an accounting system: each server instance keeps its own counters,
 * so a horizontally-scaled deploy allows roughly N× the stated limit. That is
 * still orders of magnitude better than unlimited, and it costs no round-trip.
 * Swap `hit()` for a Redis/Upstash-backed version if precise global limits are
 * ever needed — the call sites do not change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Bound memory: once the map gets large, drop every expired bucket… */
const SWEEP_THRESHOLD = 10_000;
/** …and if it is still over this, drop the oldest live ones. Spoofed client
 * addresses must not be able to grow the map without limit. */
const HARD_CAP = 50_000;

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= HARD_CAP) {
    // Map iterates in insertion order, so this evicts the oldest buckets.
    let excess = buckets.size - HARD_CAP / 2;
    for (const key of buckets.keys()) {
      if (excess-- <= 0) break;
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets — for a Retry-After header. */
  retryAfterSec: number;
}

/**
 * Count one hit for `key` and report whether it is within `limit` per
 * `windowMs`. Keys should be namespaced by route ("login:1.2.3.4").
 */
export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= SWEEP_THRESHOLD) sweep(now);
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/**
 * Best-effort client address.
 *
 * `x-real-ip` is set by the nearest proxy (Vercel, nginx, most load
 * balancers) to the connecting address and cannot be pre-filled by the
 * client, so it is preferred. `x-forwarded-for` is appended to, so the client
 * can seed its first entry — that only lets an attacker split their own
 * traffic across buckets, and the map is hard-capped, so it degrades the
 * limiter rather than the server. With no proxy at all every caller shares
 * one bucket, which only makes the limiter stricter.
 */
export function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real.slice(0, 64);
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim().slice(0, 64) || 'unknown';
  return 'unknown';
}
