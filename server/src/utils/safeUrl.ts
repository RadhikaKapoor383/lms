// Links that students/instructors paste in are later shown to other people as
// clickable links, so only plain https links are accepted. This rejects things
// like "javascript:alert(1)", "data:text/html,...", "file:///etc/passwd" and
// links with a username:password inside.

const MAX_URL_LENGTH = 2000;

// Returns the cleaned URL, or null if it isn't an acceptable https link.
export const parseHttpsUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".")) return null; // "https://localhost", "https://intranet"
  return url.toString();
};
