import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";
import dotenv from "dotenv";
dotenv.config();

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

// Parse expiry env vars with sensible fallbacks
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "5", 10);
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "3", 10);

export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  // Cache the user session in Redis with a rolling 7-day TTL.
  // Every login/refresh resets this, so active users never get logged out,
  // but idle sessions expire instead of accumulating forever.
  const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
  redis.set(String(user._id), JSON.stringify(user), "EX", SESSION_TTL_SECONDS);

  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
  }

  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};
