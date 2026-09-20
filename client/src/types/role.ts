// Mirrors USER_ROLES on the server (server/src/models/user.model.ts).
// Keep the two lists in sync - the server is the source of truth.
export const ROLES = ["admin", "instructor", "student"] as const;
export type Role = (typeof ROLES)[number];

// Where each role lands after login / when redirected away from a page
// they aren't allowed to see.
export const roleHome: Record<Role, string> = {
  admin: "/admin",
  instructor: "/instructor",
  student: "/dashboard",
};

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  instructor: "Instructor",
  student: "My learning",
};
