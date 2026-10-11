import { Request } from "express";
import { IUser } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      // set by isAuthenticated: which login (session) this request belongs to
      sessionInfo?: { sid: string; loginAt: number };
    }
  }
}
