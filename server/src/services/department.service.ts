// Department rules with no database involved, so they can be tested on their own.

export const DEPARTMENT_NAME_MAX = 80;

// Trims and collapses inner whitespace ("  Computer   Science " -> "Computer Science").
// Returns an error message instead when the name can't be used.
export const cleanDepartmentName = (raw: unknown): { name: string } | { error: string } => {
  if (typeof raw !== "string") return { error: "Department name is required" };
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Department name is required" };
  if (name.length > DEPARTMENT_NAME_MAX) {
    return { error: `Department name can be at most ${DEPARTMENT_NAME_MAX} characters` };
  }
  return { name };
};

// A case-insensitive exact-match pattern, so "computer science" and
// "Computer Science" count as the same department.
export const exactNamePattern = (name: string) =>
  new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

// What a department value from a form means:
//   undefined   - the field wasn't sent: leave whatever is saved alone
//   null        - sent empty ("" or null): no department
//   "<id>"      - a department id (still to be checked against the database)
export const readDepartmentInput = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "object" && value && "_id" in (value as any)) {
    // the edit form can send back the populated { _id, name } it was given
    return String((value as any)._id);
  }
  return String(value);
};

// The department a NEW course ends up in. An instructor who leaves the field
// empty gets their own department (if they have one); an admin's choice -
// including "none" - is kept as it is.
export const departmentForNewCourse = (
  chosen: string | null | undefined,
  creatorRole: string | undefined,
  creatorDepartment: string | null | undefined
): string | null => {
  if (chosen) return chosen;
  if (creatorRole === "instructor" && creatorDepartment) return String(creatorDepartment);
  return null;
};
