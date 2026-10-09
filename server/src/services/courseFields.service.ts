// Without a whitelist, an instructor could publish their own course (skipping
// admin approval), hand a course to someone else, or fake ratings and
// enrollment counts by sending extra fields in the request body.
// Only these fields can be set through create/edit-course. A whitelist (instead
// of "remove the bad ones") means a field added to the model later is NOT
// writable from the outside until someone deliberately lists it here.
// "enrollmentCode" is the plain code, hashed by prepareEnrollmentSettings.
const COURSE_EDITABLE_FIELDS = [
  "name",
  "description",
  "price",
  "estimatedPrice",
  "thumbnail",
  "category",
  "level",
  "demoUrl",
  "benefits",
  "prerequisites",
  "enrollmentMode",
  "enrollmentCode",
  "durationHours",
] as const;
// Only an admin may set these (an instructor's course is always their own and
// goes live only through the approval flow).
const COURSE_ADMIN_FIELDS = ["status", "instructor"] as const;

export const pickCourseFields = (
  body: Record<string, any> | undefined,
  isAdmin: boolean
): Record<string, any> => {
  const picked: Record<string, any> = {};
  const allowed: readonly string[] = isAdmin
    ? [...COURSE_EDITABLE_FIELDS, ...COURSE_ADMIN_FIELDS]
    : COURSE_EDITABLE_FIELDS;
  for (const key of allowed) {
    if (body && key in body) picked[key] = body[key];
  }
  // an empty duration box means "not set"
  if (picked.durationHours === "" || picked.durationHours === null) {
    delete picked.durationHours;
  }
  return picked;
};
