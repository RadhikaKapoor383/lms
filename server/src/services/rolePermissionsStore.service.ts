import RolePermissionsModel from "../models/rolePermissions.model";
import { redis } from "../utils/redis";
import { DeniedByRole, NOTHING_DENIED, PERMISSION_ROLES } from "./permissions.service";

// The switched-off permissions are read on many requests, so they are kept in
// Redis (shared by every server instance) and only read from MongoDB when the
// cached copy is missing. Saving new permissions replaces the cached copy.
const CACHE_KEY = "rolePermissions";
const CACHE_SECONDS = 600;

export const loadDeniedPermissions = async (): Promise<DeniedByRole> => {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    try {
      return { ...NOTHING_DENIED, ...JSON.parse(cached) };
    } catch {
      /* fall through to the database */
    }
  }
  const docs = await RolePermissionsModel.find().lean();
  const denied: DeniedByRole = { instructor: [], student: [] };
  for (const d of docs as any[]) {
    if ((PERMISSION_ROLES as readonly string[]).includes(d.role)) denied[d.role as "instructor" | "student"] = d.denied || [];
  }
  await redis.set(CACHE_KEY, JSON.stringify(denied), "EX", CACHE_SECONDS);
  return denied;
};

export const saveDeniedPermissions = async (
  changes: Partial<DeniedByRole>,
  updatedBy: string
): Promise<DeniedByRole> => {
  for (const role of PERMISSION_ROLES) {
    const list = changes[role];
    if (!list) continue;
    await RolePermissionsModel.findOneAndUpdate(
      { role },
      { $set: { denied: [...new Set(list)].sort(), updatedBy } },
      { upsert: true, new: true }
    );
  }
  await redis.del(CACHE_KEY);
  return loadDeniedPermissions();
};
