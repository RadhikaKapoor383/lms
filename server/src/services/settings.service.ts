import SettingsModel, { ISettings } from "../models/settings.model";

export const DEFAULT_PLATFORM_NAME = process.env.PLATFORM_NAME || "LMS";

export interface IPlatformSettings {
  platformName: string;
  requireCourseApproval: boolean;
  allowSelfEnrollment: boolean;
}

// Only these fields can be changed through the API, and only with the right
// type. Anything else in the request body is ignored.
// Returns the clean update, or an error message.
export const parseSettingsUpdate = (
  body: any
): { update: Partial<IPlatformSettings> } | { error: string } => {
  const update: Partial<IPlatformSettings> = {};

  if (body?.platformName !== undefined) {
    const name = typeof body.platformName === "string" ? body.platformName.trim() : "";
    if (!name || name.length > 60) {
      return { error: "Platform name must be 1 to 60 characters" };
    }
    update.platformName = name;
  }

  for (const key of ["requireCourseApproval", "allowSelfEnrollment"] as const) {
    if (body?.[key] !== undefined) {
      if (typeof body[key] !== "boolean") {
        return { error: `${key} must be true or false` };
      }
      update[key] = body[key];
    }
  }

  if (Object.keys(update).length === 0) {
    return { error: "Nothing to update" };
  }
  return { update };
};

// The settings document, created with defaults the first time it's needed.
// Upsert + $setOnInsert keeps this safe when two requests arrive together on a
// fresh database: only one insert happens.
export const getSettings = async (): Promise<ISettings> =>
  (await SettingsModel.findOneAndUpdate(
    { key: "platform" },
    { $setOnInsert: { key: "platform", platformName: DEFAULT_PLATFORM_NAME } },
    { new: true, upsert: true }
  )) as ISettings;
