import jwt, { JwtPayload } from "jsonwebtoken";
import { getSessionLimits, isPastMax, touchSession } from "../utils/session";

// Reads a cookie out of a raw Cookie header (no extra package needed).
export const readCookie = (header: string | undefined, name: string): string | undefined => {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
};

// Who is opening a socket: the same rules as any request (a valid access
// token whose login session is still alive). Returns the user id, or null.
export const socketUserId = async (cookieHeader: string | undefined): Promise<string | null> => {
  const token = readCookie(cookieHeader, "access_token");
  if (!token) return null;
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN as string) as JwtPayload;
  } catch {
    return null; // expired: the website renews it and reconnects
  }
  if (typeof decoded.sid !== "string" || typeof decoded.loginAt !== "number" || typeof decoded.id !== "string") return null;
  if (isPastMax(decoded.loginAt, getSessionLimits().maxSeconds)) return null;
  if (!(await touchSession(decoded.sid, decoded.id))) return null;
  return decoded.id;
};
