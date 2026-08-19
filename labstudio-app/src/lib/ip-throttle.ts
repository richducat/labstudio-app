// Lightweight in-memory sliding-window throttle.
// The app runs as ONE persistent Passenger/Node process, so this Map is shared
// across all requests and is effective (not a per-lambda no-op). It is a speed
// bump against enumeration / cost-amplification, not a distributed rate limiter.

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the Map cannot grow unbounded.
let lastSweep = 0;
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    b.hits = b.hits.filter((t) => now - t < windowMs);
    if (b.hits.length === 0) buckets.delete(key);
  }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Returns true if the caller is within the limit (allowed), false if throttled.
 * @param key   stable identity (e.g. `login:${ip}`)
 * @param limit max requests allowed within the window
 * @param windowMs window size in ms
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);
  const b = buckets.get(key) || { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    buckets.set(key, b);
    return false;
  }
  b.hits.push(now);
  buckets.set(key, b);
  return true;
}
