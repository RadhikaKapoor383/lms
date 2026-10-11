"use client";

import { useLoadUserQuery } from "@/redux/features/auth/authApi";
import SessionGuard from "@/components/SessionGuard";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  // Fires /me on first load - if a valid session cookie exists, this
  // populates the auth slice so the header shows the logged-in state.
  useLoadUserQuery(undefined);
  return (
    <>
      {children}
      <SessionGuard />
    </>
  );
}
