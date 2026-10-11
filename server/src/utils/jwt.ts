import { Response } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../models/user.model";
import { redis } from "./redis";
import { getSessionLimits, secondsUntilMax, startSession } from "./session";
import dotenv from "dotenv";
dotenv.config();

// Parse expiry env vars with sensible fallbacks
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "5", 10); // minutes
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "3", 10); // days

// The cap itself is enforced by the SERVER, by comparing the login time inside
// the token with the clock (see isAuthenticated). The tokens are made to expire
// only a couple of minutes after the cap, so that a request just past the cap
// reaches that check and gets the clear "your session ended after 2 hours"
// answer, instead of a bare "token expired" the page can't explain.
export const TOKEN_SLACK_SECONDS = 120;

// Builds a fresh pair of tokens + cookie settings for one login (session).
// They never outlive the session's hard cap (default 2 hours from login) by
// more than the slack above - used at login and whenever the access token is
// renewed (a renewal keeps the ORIGINAL login time, so it can't stretch the cap).
export const buildAuthTokens = (userId: string, sid: string, loginAt: number) => {
  // With no hard cap (the default) there is nothing to limit: tokens last their
  // normal time and are renewed as long as the person stays active. Whether the
  // login is still alive is the session's idle clock, checked on every request.
  const left =
    Math.max(1, secondsUntilMax(loginAt, getSessionLimits().maxSeconds)) + TOKEN_SLACK_SECONDS;
  const accessSeconds = Math.min(accessTokenExpire * 60, left);
  const refreshSeconds = Math.min(refreshTokenExpire * 24 * 60 * 60, left);

  const claims = { id: userId, sid, loginAt };
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  return {
    accessToken: jwt.sign(claims, process.env.ACCESS_TOKEN as string, { expiresIn: accessSeconds }),
    refreshToken: jwt.sign(claims, process.env.REFRESH_TOKEN as string, { expiresIn: refreshSeconds }),
    accessOptions: { ...common, maxAge: accessSeconds * 1000 },
    refreshOptions: { ...common, maxAge: refreshSeconds * 1000 },
  };
};

export const describeSession = (loginAt: number) => {
  const { maxSeconds, idleSeconds } = getSessionLimits();
  return {
    // null = no hard cap; the login only ends after sitting idle
    endsAt: maxSeconds > 0 ? new Date((loginAt + maxSeconds) * 1000).toISOString() : null,
    maxSeconds,
    idleSeconds,
    serverNow: new Date().toISOString(),
  };
};

export const sendToken = async (user: IUser, statusCode: number, res: Response) => {
  const userId = String(user._id);
  const { sid, loginAt } = await startSession(userId);
  const { accessToken, refreshToken, accessOptions, refreshOptions } = buildAuthTokens(
    userId,
    sid,
    loginAt
  );

  // Cache the user in Redis with a rolling 7-day TTL (this is also how a
  // deactivated or role-changed user gets cut off: deleting it ends every
  // session of that user). Whether a login is still alive is decided
  // separately, by the session id above.
  const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
  await redis.set(userId, JSON.stringify(user), "EX", SESSION_TTL_SECONDS);

  res.cookie("access_token", accessToken, accessOptions);
  res.cookie("refresh_token", refreshToken, refreshOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
    session: describeSession(loginAt),
  });
};
