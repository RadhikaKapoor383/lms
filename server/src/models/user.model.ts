import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Single source of truth for roles. Routes, controllers and the admin
// "change role" endpoint all read from here, so a typo can't create a new role.
export const USER_ROLES = ["admin", "instructor", "student"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// "pending" / "rejected" only ever apply when the platform requires admin
// approval for new students. Accounts created before this field existed have
// none, which counts as approved.
export const APPROVAL_STATUSES = ["approved", "pending", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  avatar: {
    public_id: string;
    url: string;
  };
  role: UserRole;
  isVerified: boolean;
  // false = deactivated by an admin: cannot log in and is signed out at once.
  // Accounts created before this field existed have none, which counts as active.
  isActive?: boolean;
  approvalStatus?: ApprovalStatus;
  bio?: string;
  expertise?: string[];
  createdAt?: Date; // added by the schema's timestamps option
  // SHA-256 of the emailed reset token (never the token itself) and its expiry.
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  courses: Array<{ courseId: string }>;
  comparePassword: (password: string) => Promise<boolean>;
  SignAccessToken: () => string;
  SignRefreshToken: () => string;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      validate: {
        validator: (value: string) => emailRegexPattern.test(value),
        message: "Please enter a valid email",
      },
      unique: true,
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
      // Not required: social-auth users don't have a local password
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "student",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: { type: Boolean, default: true },
    approvalStatus: { type: String, enum: APPROVAL_STATUSES, default: "approved" },
    bio: { type: String, maxlength: 500, default: "" },
    expertise: { type: [String], default: [] },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    courses: [
      {
        courseId: String,
      },
    ],
  },
  { timestamps: true }
);

// A user document is turned into JSON in many places (the login response, the
// Redis session cache, update-password...). Login loads the password with
// select("+password"), and without this the bcrypt hash was sent to the browser
// and cached in Redis along with the rest of the user. Stripping it here covers
// every one of those places at once.
userSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    return ret;
  },
});

// Hash password before saving (only if it was modified)
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.SignAccessToken = function (): string {
  const minutes = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "5", 10);
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN as string, {
    expiresIn: minutes * 60, // seconds
  });
};

userSchema.methods.SignRefreshToken = function (): string {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "3", 10);
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN as string, {
    expiresIn: days * 24 * 60 * 60, // seconds
  });
};

userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const userModel: Model<IUser> = mongoose.model("User", userSchema);
export default userModel;
