import crypto from "crypto";
import { redis } from "./redis";
import ErrorHandler from "./ErrorHandler";

// Limits on every login ("session"):
//
//   IDLE - logged out after this long with no activity (default 30 minutes).
//          Every request, and the small "still here" ping the website sends
//          while someone is really using it, restarts this clock. Someone who
//          keeps studying is never logged out by this.
//   MAX  - OPTIONAL hard cap measured from the moment of login. Off by default
//          (0): a student who is active is not kicked out. Set SESSION_MAX_HOURS
//          (for example on a shared lab computer) to also log everyone out
//          after that long, active or not.
//
// Each login gets its own random session id. It is signed into the user's
// tokens, and the server keeps `sess:<id>` in Redis with an expiry equal to
// the idle limit. If that key is gone, the session is over - whatever the
// tokens say. Several devices therefore have independent sessions.

export interface ISessionLimits {
  maxSeconds: number; // 0 = no hard cap
  idleSeconds: number;
}

const positive = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Read from the environment each time (not once at import) so it can be tested.
export const getSessionLimits = (env: NodeJS.ProcessEnv = process.env): ISessionLimits => ({
  maxSeconds: positive(env.SESSION_MAX_HOURS, 0) > 0
    ? Math.max(1, Math.round(positive(env.SESSION_MAX_HOURS, 0) * 3600))
    : 0,
  idleSeconds: Math.max(1, Math.round(positive(env.SESSION_IDLE_MINUTES, 30) * 60)),
});

export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

// Seconds left before the hard cap (0 or less = over). With no cap there is
// no end, so this is Infinity.
export const secondsUntilMax = (loginAt: number, maxSeconds: number, now = nowSeconds()): number =>
  maxSeconds <= 0 ? Infinity : loginAt + maxSeconds - now;

export const isPastMax = (loginAt: number, maxSeconds: number, now = nowSeconds()): boolean =>
  maxSeconds > 0 && secondsUntilMax(loginAt, maxSeconds, now) <= 0;

// "2 hours", "30 minutes", "90 seconds" - for messages shown to people.
export const describeDuration = (seconds: number): string => {
  if (seconds % 3600 === 0) {
    const h = seconds / 3600;
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  if (seconds % 60 === 0) {
    const m = seconds / 60;
    return `${m} minute${m === 1 ? "" : "s"}`;
  }
  return `${seconds} seconds`;
};

const sessKey = (sid: string) => `sess:${sid}`;

export const startSession = async (userId: string): Promise<{ sid: string; loginAt: number }> => {
  const sid = crypto.randomBytes(16).toString("hex");
  await redis.set(sessKey(sid), userId, "EX", getSessionLimits().idleSeconds);
  return { sid, loginAt: nowSeconds() };
};

// Is this session still alive for this user? If so, restart its idle clock.
export const touchSession = async (sid: string, userId: string): Promise<boolean> => {
  const owner = await redis.get(sessKey(sid));
  if (owner !== userId) return false;
  await redis.expire(sessKey(sid), getSessionLimits().idleSeconds);
  return true;
};

export const endSession = async (sid: string): Promise<void> => {
  await redis.del(sessKey(sid));
};

// The 401 sent when a session is over. The "code" lets the website tell this
// apart from a merely expired access token (which it quietly renews).
export const sessionEndedError = (kind: "idle" | "max"): ErrorHandler => {
  const { maxSeconds, idleSeconds } = getSessionLimits();
  return kind === "max"
    ? new ErrorHandler(
        `Your session ended after ${describeDuration(maxSeconds)}. Please log in again.`,
        401,
        "SESSION_MAX"
      )
    : new ErrorHandler(
        `You were logged out after ${describeDuration(idleSeconds)} of inactivity. Please log in again.`,
        401,
        "SESSION_IDLE"
      );
};
