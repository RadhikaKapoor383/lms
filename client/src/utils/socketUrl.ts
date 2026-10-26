// The Socket.io server lives on the same host as the API, at its root
// ("http://localhost:8000/api/v1" -> "http://localhost:8000").
export const socketOrigin = (apiBase: string | undefined): string | null => {
  if (!apiBase) return null;
  try {
    return new URL(apiBase).origin;
  } catch {
    return null;
  }
};
