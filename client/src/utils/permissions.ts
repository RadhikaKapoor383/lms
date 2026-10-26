// Whether the signed-in user's role may do something, from the server's
// /my-permissions answer. No React here, so it can be tested on its own.
export const canWith = (data: { governed?: string[]; allowed?: string[] } | undefined, key: string): boolean => {
  if (!data?.governed || !data.allowed) return true; // loading or failed: show everything, as before
  if (!data.governed.includes(key)) return true; // not a switch for this role
  return data.allowed.includes(key);
};
