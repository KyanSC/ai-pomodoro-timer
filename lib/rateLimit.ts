import { redis } from './redis';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
};

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // If Redis is not configured, allow all requests (dev-friendly)
  if (!redis) {
    const now = Date.now();
    return { allowed: true, remaining: config.maxRequests, resetTime: now + config.windowMs };
  }
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get current request count
  const requests = await redis.zrange(
    key,
    windowStart,
    '+inf',
    { byScore: true, withScores: true }
  );

  const currentCount = requests.length / 2; // Each request has a score and value

  if (currentCount >= config.maxRequests) {
    const oldestRequest = parseInt(requests[1] as string);
    const resetTime = oldestRequest + config.windowMs;

    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }

  // Add current request
  await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  await redis.expire(key, Math.ceil(config.windowMs / 1000));

  return {
    allowed: true,
    remaining: config.maxRequests - currentCount - 1,
    resetTime: now + config.windowMs,
  };
}
