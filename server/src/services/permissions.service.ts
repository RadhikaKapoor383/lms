// Role permissions: things an admin can switch off for every instructor or
// every student. Admins can always do everything (so nobody can lock the
// platform's admins out). Everything is allowed by default, so a fresh
// database - or a permission added in a later version - changes nothing until
// an admin turns it off. Only the switched-off keys are stored.
// No database in here, so it can be tested on its own.

export const PERMISSION_ROLES = ["instructor", "student"] as const;
export type PermissionRole = (typeof PERMISSION_ROLES)[number];

export interface IPermission {
  key: string;
  role: PermissionRole;
  label: string; // what the role may do, for the admin page and error messages
}

export const PERMISSIONS: IPermission[] = [
  { key: "course.create", role: "instructor", label: "create new courses" },
  { key: "course.edit", role: "instructor", label: "edit their courses" },
  { key: "course.submit", role: "instructor", label: "submit courses for approval (or publish them, when approval is off)" },
  { key: "material.manage", role: "instructor", label: "upload, move and delete course files" },
  { key: "assignment.manage", role: "instructor", label: "create, edit and grade assignments" },
  { key: "quiz.manage", role: "instructor", label: "create, edit and delete quizzes" },
  { key: "announcement.post", role: "instructor", label: "post and delete course announcements" },
  { key: "student.enroll", role: "instructor", label: "enroll and remove students" },
  { key: "review.reply", role: "instructor", label: "reply to course reviews" },
  { key: "enroll.self", role: "student", label: "enroll in or buy courses themselves" },
  { key: "discussion.post", role: "student", label: "start discussions and reply in them" },
  { key: "review.write", role: "student", label: "write course reviews" },
  { key: "content.report", role: "student", label: "flag discussion posts for review" },
];

const BY_KEY = new Map(PERMISSIONS.map((p) => [p.key, p]));
export const getPermission = (key: string) => BY_KEY.get(key);

export type DeniedByRole = Record<PermissionRole, string[]>;
export const NOTHING_DENIED: DeniedByRole = { instructor: [], student: [] };

// May someone with this role do this? Admins always may; a permission that
// belongs to another role doesn't apply (e.g. instructors are never stopped
// by a student switch). Keys used in routes are checked when the route is
// defined (requirePermission throws on a typo), so an unknown key never
// reaches this.
export const isAllowed = (role: string | undefined, key: string, denied: DeniedByRole): boolean => {
  if (role === "admin") return true;
  const p = BY_KEY.get(key);
  if (!p || p.role !== role) return true;
  return !(denied[p.role] || []).includes(key);
};

// The admin page sends { instructor: { "quiz.manage": false, ... }, student: {...} }.
// Returns the switched-off keys per role, or an error.
export const parsePermissionUpdate = (body: any): { denied: DeniedByRole } | { error: string } => {
  if (!body || typeof body !== "object") return { error: "Send the permissions to change" };
  const denied: DeniedByRole = { instructor: [], student: [] };
  for (const role of PERMISSION_ROLES) {
    const given = body[role];
    if (given === undefined) continue;
    if (!given || typeof given !== "object" || Array.isArray(given)) return { error: `Permissions for ${role} must be an object` };
    for (const [key, value] of Object.entries(given)) {
      const p = BY_KEY.get(key);
      if (!p || p.role !== role) return { error: `Unknown ${role} permission: ${key}` };
      if (typeof value !== "boolean") return { error: `${key} must be true or false` };
      if (!value) denied[role].push(key);
    }
  }
  return { denied };
};

// For the admin page: every permission with whether it is on.
export const describePermissions = (denied: DeniedByRole) =>
  PERMISSIONS.map((p) => ({ ...p, allowed: !(denied[p.role] || []).includes(p.key) }));

// The keys a user of this role may use (for the website to hide what they can't).
export const allowedKeysFor = (role: string | undefined, denied: DeniedByRole): string[] =>
  PERMISSIONS.filter((p) => p.role === role && isAllowed(role, p.key, denied)).map((p) => p.key);
