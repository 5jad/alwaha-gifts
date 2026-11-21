/**
 * D1-based per-IP Rate Limiter
 * Restricts client IP to a maximum number of requests per 1-minute window.
 */
export async function checkRateLimit(
  db: D1Database,
  ip: string,
  maxRequestsPerMinute: number = 8
): Promise<{ allowed: boolean; remaining: number }> {
  if (!ip || ip === '127.0.0.1' || ip === 'localhost') {
    // In local dev without real IP, allow request
    return { allowed: true, remaining: maxRequestsPerMinute };
  }

  const currentMinute = Math.floor(Date.now() / 60000);

  try {
    // Upsert into rate_limits
    await db.prepare(`
      INSERT INTO rate_limits (ip, window_minute, request_count)
      VALUES (?, ?, 1)
      ON CONFLICT(ip, window_minute) DO UPDATE SET request_count = request_count + 1
    `).bind(ip, currentMinute).run();

    const row = await db.prepare(`
      SELECT request_count FROM rate_limits WHERE ip = ? AND window_minute = ?
    `).bind(ip, currentMinute).first<{ request_count: number }>();

    const count = row?.request_count || 1;
    const remaining = Math.max(0, maxRequestsPerMinute - count);

    // Opportunistically prune old records (older than 10 minutes)
    if (Math.random() < 0.1) {
      db.prepare(`DELETE FROM rate_limits WHERE window_minute < ?`).bind(currentMinute - 10).run().catch(() => {});
    }

    return {
      allowed: count <= maxRequestsPerMinute,
      remaining
    };
  } catch (err) {
    console.error('[RateLimiter] Error querying rate_limits:', err);
    // Fail-open so database transient errors do not block genuine customers
    return { allowed: true, remaining: 1 };
  }
}
