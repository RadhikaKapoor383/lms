import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import crypto from "crypto";

import userModel, { IUser, USER_ROLES } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import sendMail from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import { logActivity } from "../utils/auditLog";
import { validatePassword } from "../utils/passwordPolicy";
import {
  clearRateLimit,
  hashKeyPart,
  hitRateLimit,
  isRateLimited,
} from "../utils/rateLimit";
import {
  RESET_EXPIRE_MINUTES,
  buildResetUrl,
  generateResetToken,
  hashResetToken,
  looksLikeResetToken,
  resetExpiryFrom,
} from "../services/passwordReset.service";
import { notifyUser, notifyUsers } from "../services/notification.service";
import { getSettings } from "../services/settings.service";

// ------------------- Registration -------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
}

interface IActivationToken {
  token: string;
  activationCode: string;
}

const ACTIVATION_CODE_DIGITS = 6;

// The emailed code must NOT be readable from the token. A JWT payload is only
// signed, not encrypted: anyone holding the token (and the registration
// response hands it to whoever registered) can base64-decode it. So the token
// stores a keyed HASH of the code, and the real code only ever goes by email.
const hashActivationCode = (code: string, nonce: string): string =>
  crypto
    .createHmac("sha256", process.env.ACTIVATION_SECRET as string)
    .update(`${nonce}:${code}`)
    .digest("hex");

export const createActivationToken = (user: IRegistrationBody): IActivationToken => {
  const activationCode = crypto
    .randomInt(0, 10 ** ACTIVATION_CODE_DIGITS)
    .toString()
    .padStart(ACTIVATION_CODE_DIGITS, "0");
  const nonce = crypto.randomBytes(16).toString("hex");

  const token = jwt.sign(
    { user, nonce, codeHash: hashActivationCode(activationCode, nonce) },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" }
  );

  return { token, activationCode };
};

// Shared "slow down" error for rate-limited endpoints.
const tooManyRequests = (what: string, retryAfterSeconds: number) => {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return new ErrorHandler(
    `Too many ${what}. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    429
  );
};

// IP is only a coarse second line of defence (behind a proxy it needs
// TRUST_PROXY to be right - see app.ts), so its limits are generous.
const ipKeyPart = (req: Request): string | null =>
  req.ip ? hashKeyPart(req.ip) : null;

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body as IRegistrationBody;

      // Reject obviously bad input now, instead of emailing a code and failing
      // later at activation.
      if (typeof name !== "string" || !name.trim()) {
        return next(new ErrorHandler("Please enter your name", 400));
      }
      if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
        return next(new ErrorHandler("Please enter a valid email", 400));
      }
      const passwordProblem = validatePassword(password);
      if (passwordProblem) {
        return next(new ErrorHandler(passwordProblem, 400));
      }

      // Every registration sends an email, so cap it per address (stops someone
      // flooding a stranger's inbox) and per IP (stops mass sign-ups).
      const emailLimit = await hitRateLimit(
        `register:${hashKeyPart(email.trim().toLowerCase())}`,
        5,
        60 * 60
      );
      if (!emailLimit.allowed) {
        return next(tooManyRequests("sign-up attempts for this email", emailLimit.retryAfterSeconds));
      }
      const ipPart = ipKeyPart(req);
      if (ipPart) {
        const ipLimit = await hitRateLimit(`register-ip:${ipPart}`, 20, 60 * 60);
        if (!ipLimit.allowed) {
          return next(tooManyRequests("sign-up attempts", ipLimit.retryAfterSeconds));
        }
      }

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user: IRegistrationBody = { name, email, password };

      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.name }, activationCode };

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email: ${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------- Activation -------------------

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } = req.body ?? {};

      if (typeof activation_token !== "string" || typeof activation_code !== "string") {
        return next(new ErrorHandler("Activation token and code are required", 400));
      }

      // A code is only a few digits, so cap the guesses per token.
      const ATTEMPT_LIMIT = 5;
      const attemptKey = `activate:${hashKeyPart(activation_token)}`;
      const locked = await isRateLimited(attemptKey, ATTEMPT_LIMIT);
      if (!locked.allowed) {
        return next(tooManyRequests("wrong codes", locked.retryAfterSeconds));
      }

      const payload = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as {
        user: IRegistrationBody;
        nonce?: string;
        codeHash?: string;
      };

      if (!payload.nonce || !payload.codeHash) {
        return next(new ErrorHandler("Activation link is out of date - please sign up again", 400));
      }

      const expected = Buffer.from(payload.codeHash, "hex");
      const given = Buffer.from(hashActivationCode(activation_code.trim(), payload.nonce), "hex");
      const codeIsValid =
        expected.length === given.length && crypto.timingSafeEqual(expected, given);

      if (!codeIsValid) {
        await hitRateLimit(attemptKey, ATTEMPT_LIMIT, 10 * 60);
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = payload.user;

      const existUser = await userModel.findOne({ email });
      if (existUser) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      // Email is verified now. Whether the student can log in yet depends on
      // the platform setting.
      const needsApproval = (await getSettings()).requireStudentApproval;

      const user = await userModel.create({
        name,
        email,
        password,
        isVerified: true,
        approvalStatus: needsApproval ? "pending" : "approved",
      });

      if (needsApproval) {
        const admins = await userModel
          .find({ role: "admin", isActive: { $ne: false } })
          .select("_id");
        await notifyUsers(
          admins.map((a) => String(a._id)),
          "New student awaiting approval",
          `${name} (${email}) verified their email and needs your approval`,
          "/admin/users"
        );
      }

      res.status(201).json({ success: true, user, pendingApproval: needsApproval });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------- Login -------------------

interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = (req.body ?? {}) as ILoginRequest;

      // Must be plain strings: an object like {"$ne": null} would otherwise be
      // handed to MongoDB as a query operator.
      if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
        return next(new ErrorHandler("Please enter email and password", 400));
      }

      // Only FAILED logins are counted, per email (a stranger can't lock you
      // out by merely visiting) with a generous per-IP cap on top.
      const EMAIL_FAIL_LIMIT = 10;
      const IP_FAIL_LIMIT = 100;
      const WINDOW_SECONDS = 15 * 60;
      const emailKey = `login:${hashKeyPart(email.trim().toLowerCase())}`;
      const ipPart = ipKeyPart(req);
      const ipKey = ipPart ? `login-ip:${ipPart}` : null;

      const emailLocked = await isRateLimited(emailKey, EMAIL_FAIL_LIMIT);
      if (!emailLocked.allowed) {
        return next(tooManyRequests("failed logins", emailLocked.retryAfterSeconds));
      }
      if (ipKey) {
        const ipLocked = await isRateLimited(ipKey, IP_FAIL_LIMIT);
        if (!ipLocked.allowed) {
          return next(tooManyRequests("failed logins", ipLocked.retryAfterSeconds));
        }
      }

      const recordFailure = async () => {
        await hitRateLimit(emailKey, EMAIL_FAIL_LIMIT, WINDOW_SECONDS);
        if (ipKey) await hitRateLimit(ipKey, IP_FAIL_LIMIT, WINDOW_SECONDS);
      };

      const user = await userModel.findOne({ email }).select("+password");

      // Same message and same counting whether the email exists or not, so the
      // response doesn't reveal which emails have accounts.
      if (!user) {
        await recordFailure();
        return next(new ErrorHandler("Invalid email or password", 400));
      }

      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        await recordFailure();
        return next(new ErrorHandler("Invalid email or password", 400));
      }

      if (user.isActive === false) {
        return next(
          new ErrorHandler("This account has been deactivated. Please contact an administrator.", 403)
        );
      }

      // Only said AFTER the password is right, so it can't be used to probe
      // which emails are registered.
      if (user.approvalStatus === "pending") {
        return next(
          new ErrorHandler(
            "Your account is waiting for admin approval. We'll email you as soon as it's approved.",
            403
          )
        );
      }
      if (user.approvalStatus === "rejected") {
        return next(
          new ErrorHandler("Your registration was not approved. Please contact an administrator.", 403)
        );
      }

      await clearRateLimit(emailKey);
      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------- Logout -------------------

export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });

      const userId = req.user?._id ? String(req.user._id) : undefined;
      if (userId) {
        await redis.del(userId);
      }

      res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------- Refresh access token -------------------

export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const message = "Could not refresh token";
      if (!decoded) {
        return next(new ErrorHandler(message, 400));
      }

      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(
          new ErrorHandler("Please login to access this resource", 400)
        );
      }

      const user = JSON.parse(session);
      // Sessions cached before the fix still carry the password hash; drop it
      // here so the re-save below cleans the session up.
      delete user.password;

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: parseInt(process.env.ACCESS_TOKEN_EXPIRE || "5", 10) * 60 }
      );

      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn:
            parseInt(process.env.REFRESH_TOKEN_EXPIRE || "3", 10) * 24 * 60 * 60,
        }
      );

      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", newRefreshToken, refreshTokenOptions);

      // refresh the rolling session TTL too
      await redis.set(user._id, JSON.stringify(user), "EX", 7 * 24 * 60 * 60);

      res.status(200).json({ success: true, accessToken });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------- Get logged-in user info -------------------

export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = String(req.user?._id);
      const userJson = await redis.get(userId);
      if (userJson) {
        const user = JSON.parse(userJson);
        delete user.password; // old cached sessions may still hold the hash
        return res.status(200).json({ success: true, user });
      }
      const user = await userModel.findById(userId);
      res.status(200).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------- Social auth -------------------

// ------------------- Update user info -------------------

interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;
      const userId = String(req.user?._id);
      const user = await userModel.findById(userId);

      if (email && user) {
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
          return next(new ErrorHandler("Email already exists", 400));
        }
        user.email = email;
      }

      if (name && user) {
        user.name = name;
      }

      await user?.save();
      await redis.set(userId, JSON.stringify(user), "EX", 7 * 24 * 60 * 60);

      res.status(200).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------- Update password -------------------

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      if (!oldPassword || !newPassword) {
        return next(new ErrorHandler("Please enter old and new password", 400));
      }

      const newPasswordProblem = validatePassword(newPassword);
      if (newPasswordProblem) {
        return next(new ErrorHandler(newPasswordProblem, 400));
      }
      if (oldPassword === newPassword) {
        return next(new ErrorHandler("New password must be different from the old one", 400));
      }

      const user = await userModel
        .findById(req.user?._id)
        .select("+password");

      if (!user || !user.password) {
        return next(new ErrorHandler("Invalid user", 400));
      }

      const isPasswordMatch = await user.comparePassword(oldPassword);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid old password", 400));
      }

      user.password = newPassword;
      await user.save();
      await redis.set(String(user._id), JSON.stringify(user), "EX", 7 * 24 * 60 * 60);

      res.status(201).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------- Update avatar -------------------

interface IUpdateProfilePicture {
  avatar: string;
}

// ------------------- Admin: get all users -------------------

export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userModel.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, users });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Admin: update user role -------------------

export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;

      // 1. Only the roles we actually define are allowed
      if (!(USER_ROLES as readonly string[]).includes(role)) {
        return next(
          new ErrorHandler(`Role must be one of: ${USER_ROLES.join(", ")}`, 400)
        );
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandler("Invalid user id", 400));
      }

      // 2. Admins can't change their own role (prevents locking out the last admin)
      if (String(req.user?._id) === String(id)) {
        return next(new ErrorHandler("You cannot change your own role", 403));
      }

      const user = await userModel.findByIdAndUpdate(
        id,
        { role },
        { new: true, runValidators: true }
      );

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      // 3. isAuthenticated reads the role from the Redis session, not from
      // MongoDB. Update the cached session too, otherwise the old role keeps
      // working until the session is rebuilt. (No session = user is logged out;
      // login will pick up the new role from the DB.)
      const cachedSession = await redis.get(id);
      if (cachedSession) {
        const session = JSON.parse(cachedSession);
        session.role = role;
        await redis.set(id, JSON.stringify(session), "EX", 7 * 24 * 60 * 60);
      }

      logActivity(req, "user.role_update", `Changed ${user.name}'s role to ${role}`, {
        targetUserId: id,
        role,
      });

      res.status(200).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Admin: delete user -------------------

export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (String(req.user?._id) === String(id)) {
        return next(new ErrorHandler("You cannot delete your own account here", 403));
      }

      const user = await userModel.findById(id);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      await user.deleteOne({ _id: id });
      await redis.del(id);

      logActivity(req, "user.delete", `Deleted user "${user.name}" (${user.email})`, {
        targetUserId: id,
      });

      res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateProfilePicture;
      const userId = String(req.user?._id);
      const user = await userModel.findById(userId);

      if (avatar && user) {
        if (user.avatar?.public_id) {
          await cloudinary.v2.uploader.destroy(user.avatar.public_id);
        }

        const myCloud = await cloudinary.v2.uploader.upload(avatar, {
          folder: "avatars",
          width: 150,
        });

        user.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      await user?.save();
      await redis.set(userId, JSON.stringify(user), "EX", 7 * 24 * 60 * 60);

      res.status(200).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ------------------- Forgot password -------------------
// Always answers the same thing, whether or not the email has an account, so
// the form can't be used to find out who is registered. (The email is only
// sent when the account exists.)

const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, we've sent a link to reset the password.";
const FORGOT_LIMIT = 3; // requests ...
const FORGOT_WINDOW_SECONDS = 60 * 60; // ... per email, per hour

export const forgotPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      if (!email || !EMAIL_PATTERN.test(email)) {
        return next(new ErrorHandler("Please enter a valid email", 400));
      }

      // Limited per EMAIL (not per IP): stops someone from flooding one person's
      // inbox with reset mails. It counts whether or not the account exists, so
      // hitting the limit reveals nothing.
      const limit = await hitRateLimit(
        `forgot:${hashKeyPart(email.toLowerCase())}`,
        FORGOT_LIMIT,
        FORGOT_WINDOW_SECONDS
      );
      if (!limit.allowed) {
        const minutes = Math.ceil(limit.retryAfterSeconds / 60);
        return next(
          new ErrorHandler(
            `Too many reset requests for this email. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
            429
          )
        );
      }

      const user = await userModel.findOne({ email });

      if (user && user.isActive !== false) {
        const { token, tokenHash } = generateResetToken();

        // Requesting a new link replaces the old one (only one is ever valid).
        await userModel.updateOne(
          { _id: user._id },
          { passwordResetToken: tokenHash, passwordResetExpires: resetExpiryFrom() }
        );

        // Sent in the background: waiting for the mail server would make
        // "account exists" noticeably slower than "no such account".
        sendMail({
          email: user.email,
          subject: "Reset your password",
          template: "password-reset.ejs",
          data: {
            name: user.name,
            resetUrl: buildResetUrl(token),
            expiresInMinutes: RESET_EXPIRE_MINUTES,
          },
        }).catch((error: any) => {
          console.error("Password reset email failed:", error.message);
        });
      }

      res.status(200).json({ success: true, message: FORGOT_PASSWORD_MESSAGE });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Reset password -------------------

const INVALID_RESET_LINK = "This reset link is invalid or has expired. Please request a new one.";

export const resetPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body || {};

      if (!looksLikeResetToken(token)) {
        return next(new ErrorHandler(INVALID_RESET_LINK, 400));
      }
      const passwordProblem = validatePassword(password);
      if (passwordProblem) {
        return next(new ErrorHandler(passwordProblem, 400));
      }

      // Claim the token and delete it in ONE atomic step. Two requests with the
      // same link can't both succeed: the second finds nothing to claim.
      const user = await userModel.findOneAndUpdate(
        { passwordResetToken: hashResetToken(token), passwordResetExpires: { $gt: new Date() } },
        { $unset: { passwordResetToken: "", passwordResetExpires: "" } }
      );
      if (!user) {
        return next(new ErrorHandler(INVALID_RESET_LINK, 400));
      }

      user.password = password;
      await user.save(); // the model's save hook hashes it

      // The session in Redis is what keeps a device logged in, so deleting it
      // signs the account out everywhere - including anyone who had got in with
      // the old password.
      await redis.del(String(user._id));

      await notifyUser(
        String(user._id),
        "Password changed",
        "Your password was reset. If this wasn't you, reset it again and contact us."
      );
      sendMail({
        email: user.email,
        subject: "Your password was changed",
        template: "password-changed.ejs",
        data: { name: user.name },
      }).catch((error: any) => {
        console.error("Password changed email failed:", error.message);
      });

      res.status(200).json({
        success: true,
        message: "Your password has been reset. You can log in with it now.",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
