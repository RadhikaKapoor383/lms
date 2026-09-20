"use client";

import RoleProtected from "./RoleProtected";

// Kept as a thin wrapper so existing imports (admin/layout.tsx) keep working.
export default function AdminProtected({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleProtected allowedRoles={["admin"]}>{children}</RoleProtected>;
}
