// Notification links come from the server and are always paths on this site
// ("/course-access/..."). Anything else (a full URL, "//evil.com") is ignored,
// so a bad value can never send someone off-site.
export const safeLink = (link?: string): string | null =>
  link && link.startsWith("/") && !link.startsWith("//") ? link : null;

export const timeAgo = (value: string | Date): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
};
