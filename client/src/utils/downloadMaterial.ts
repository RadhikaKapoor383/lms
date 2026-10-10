// Downloading a material needs the login cookie, so a plain <a href> to the API
// won't work from another origin. Fetch it with credentials, then hand the
// bytes to the browser as a file.
export const downloadMaterial = async (
  courseId: string,
  material: { _id: string; title: string; ext: string }
): Promise<void> => {
  const base = (process.env.NEXT_PUBLIC_SERVER_URI || "").replace(/\/+$/, "");
  const res = await fetch(`${base}/courses/${courseId}/materials/${material._id}/download`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Could not download the file");
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `${material.title}.${material.ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const formatFileSize = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
