import crypto from "crypto";
import { redis } from "./redis";

// A small fixed-window counter on top of Redis: the first hit starts a window,
// every hit inside it adds one, and the key expires by itself when it ends.
//
// Callers key it on something that is the same for the same "target" (for
// example the email a reset was requested for) - NOT on the client IP. Behind a
// reverse proxy every visitor can appear to share one IP unless "trust proxy"
// is configured, and an IP key would then throttle all users together.

export interface IRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Pure decision, separate from Redis so it can be tested on its own.
export const decideRateLimit = (
  count: number,
  limit: number,
  ttlSeconds: number
): IRateLimitResult => ({
  allowed: count <= limit,
  retryAfterSeconds: count <= limit ? 0 : Math.max(ttlSeconds, 1),
});

export const hashKeyPart = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);

export const hitRateLimit = async (
  key: string,
  limit: number,
  windowSeconds: number
): Promise<IRateLimitResult> => {
  try {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    const ttl = count > limit ? await redis.ttl(redisKey) : windowSeconds;
    return decideRateLimit(count, limit, ttl);
  } catch (error: any) {
    // If Redis hiccups, don't lock everyone out of resetting their password:
    // fail open and say so in the log.
    console.error("Rate limit check failed (allowing the request):", error.message);
    return { allowed: true, retryAfterSeconds: 0 };
  }
};
