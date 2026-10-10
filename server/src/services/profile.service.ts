export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_BIO_LENGTH = 500;
export const MAX_EXPERTISE_ITEMS = 10;
export const MAX_EXPERTISE_LENGTH = 40;
export const MAX_NAME_LENGTH = 80;

export interface IProfileUpdate {
  name?: string;
  bio?: string;
  expertise?: string[];
}

// Only these profile fields can be changed, and only with the right type.
// Anything else in the request body is ignored.
export const parseProfileUpdate = (
  body: any
): { update: IProfileUpdate } | { error: string } => {
  const update: IProfileUpdate = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > MAX_NAME_LENGTH) {
      return { error: `Name must be 1 to ${MAX_NAME_LENGTH} characters` };
    }
    update.name = name;
  }

  if (body?.bio !== undefined) {
    if (typeof body.bio !== "string") return { error: "Bio must be text" };
    const bio = body.bio.trim();
    if (bio.length > MAX_BIO_LENGTH) {
      return { error: `Bio can be at most ${MAX_BIO_LENGTH} characters` };
    }
    update.bio = bio;
  }

  if (body?.expertise !== undefined) {
    if (!Array.isArray(body.expertise)) return { error: "Expertise must be a list" };
    const cleaned: string[] = [];
    for (const item of body.expertise) {
      if (typeof item !== "string") return { error: "Each expertise must be text" };
      const tag = item.trim();
      if (!tag) continue; // ignore blanks
      if (tag.length > MAX_EXPERTISE_LENGTH) {
        return { error: `Each expertise can be at most ${MAX_EXPERTISE_LENGTH} characters` };
      }
      if (!cleaned.some((t) => t.toLowerCase() === tag.toLowerCase())) cleaned.push(tag);
    }
    if (cleaned.length > MAX_EXPERTISE_ITEMS) {
      return { error: `Add at most ${MAX_EXPERTISE_ITEMS} expertise tags` };
    }
    update.expertise = cleaned;
  }

  return { update };
};

// Step 1 of changing your email: the new address plus your CURRENT password
// (so someone who walks up to an open laptop can't take over the account).
export const parseEmailChangeRequest = (
  body: any
): { newEmail: string; password: string } | { error: string } => {
  const newEmail = typeof body?.newEmail === "string" ? body.newEmail.trim() : "";
  if (!EMAIL_PATTERN.test(newEmail) || newEmail.length > 254) {
    return { error: "Please enter a valid email" };
  }
  if (typeof body?.password !== "string" || !body.password) {
    return { error: "Enter your current password to change your email" };
  }
  return { newEmail, password: body.password };
};
