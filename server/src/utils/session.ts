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
  await redis.del(sessKey(sid), refreshKey(sid));
};

// ------------------- Refresh-token rotation -------------------
// Every refresh token carries an id (jti). For each login, Redis keeps the id
// of the one refresh token that may be used next ("cur"). Using it hands out a
// new token with a new id; the old id is then remembered as "prev" for a few
// seconds only, so two tabs refreshing at the same moment both succeed.
// Any other id - a refresh token that was already used - means the token was
// copied: the whole login is ended, for the thief and the real user alike.

export const REFRESH_GRACE_SECONDS = 20;

export interface IRefreshState {
  cur: string;
  prev: string;
  prevUntil: number; // seconds
}

export type RefreshDecision =
  | { action: "rotate"; next: IRefreshState; jti: string } // jti = the new token's id
  | { action: "grace"; jti: string } // reissue with the CURRENT id, nothing changes
  | { action: "reuse" }; // stolen / replayed: end the login

// The rule, with no Redis involved. REFRESH_SCRIPT below is the same rule run
// inside Redis, so that two requests can never both "rotate" the same token.
export const decideRefresh = (
  state: IRefreshState | null,
  tokenJti: string,
  newJti: string,
  now: number
): RefreshDecision => {
  // No record (a login from before rotation existed, or Redis lost it): there
  // is nothing to compare with, so accept it once and start rotating.
  if (!state || state.cur === tokenJti) {
    return { action: "rotate", jti: newJti, next: { cur: newJti, prev: tokenJti, prevUntil: now + REFRESH_GRACE_SECONDS } };
  }
  // prevUntil is 0 on a fresh chain, so an empty "prev" never matches there;
  // after a pre-rotation token (no jti) was rotated it does, for the grace seconds.
  if (state.prevUntil > 0 && state.prev === tokenJti && now <= state.prevUntil) {
    return { action: "grace", jti: state.cur };
  }
  return { action: "reuse" };
};

const refreshKey = (sid: string) => `rt:${sid}`;

// KEYS[1] = rt:<sid>; ARGV = tokenJti, newJti, now, grace, ttl
const REFRESH_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
local jti, newJti, now, grace, ttl = ARGV[1], ARGV[2], tonumber(ARGV[3]), tonumber(ARGV[4]), tonumber(ARGV[5])
local cur, prev, prevUntil = nil, '', 0
if raw then
  local s = cjson.decode(raw)
  cur = s.cur or ''
  prev = s.prev or ''
  prevUntil = tonumber(s.prevUntil) or 0
end
if cur == nil or cur == jti then
  redis.call('SET', KEYS[1], cjson.encode({cur = newJti, prev = jti, prevUntil = now + grace}), 'EX', ttl)
  return {'rotate', newJti}
end
if prevUntil > 0 and prev == jti and now <= prevUntil then
  return {'grace', cur}
end
redis.call('DEL', KEYS[1])
return {'reuse', ''}
`;

export const newRefreshId = (): string => crypto.randomBytes(12).toString("hex");

// At login: this login's first refresh token id.
export const startRefreshChain = async (sid: string, jti: string, ttlSeconds: number): Promise<void> => {
  const state: IRefreshState = { cur: jti, prev: "", prevUntil: 0 };
  await redis.set(refreshKey(sid), JSON.stringify(state), "EX", Math.max(1, Math.round(ttlSeconds)));
};

// At refresh: atomically check the presented id and (normally) move on to a new one.
export const useRefreshToken = async (
  sid: string,
  tokenJti: string,
  ttlSeconds: number
): Promise<{ action: "rotate" | "grace"; jti: string } | { action: "reuse" }> => {
  const result = (await (redis as any).eval(
    REFRESH_SCRIPT,
    1,
    refreshKey(sid),
    tokenJti,
    newRefreshId(),
    String(nowSeconds()),
    String(REFRESH_GRACE_SECONDS),
    String(Math.max(1, Math.round(ttlSeconds)))
  )) as [string, string];
  if (result[0] === "reuse") return { action: "reuse" };
  return { action: result[0] as "rotate" | "grace", jti: result[1] };
};

// The 401 sent when a session is over. The "code" lets the website tell this
// apart from a merely expired access token (which it quietly renews).
export const sessionEndedError = (kind: "idle" | "max" | "reused"): ErrorHandler => {
  const { maxSeconds, idleSeconds } = getSessionLimits();
  if (kind === "reused") {
    return new ErrorHandler(
      "For your safety you were logged out: your login was used from somewhere else. Please log in again.",
      401,
      "SESSION_REVOKED"
    );
  }
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
