"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/hooks/redux";
import { useLoadUserQuery } from "@/redux/features/auth/authApi";
import { Role, roleHome } from "@/types/role";
import Loader from "./Loader";

// Client-side route guard: only users whose role is in `allowedRoles` see the
// children. This is a convenience for the UI - the real protection is the
// authorizeRoles middleware on the server, which checks every API request.
export default function RoleProtected({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[];
  children: React.ReactNode;
}) {
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading } = useLoadUserQuery(undefined);
  const router = useRouter();

  const allowed = !!user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (isLoading) return; // wait for /me to resolve before deciding

    if (!user) {
      router.push("/login");
    } else if (!allowed) {
      // Send them to their own area instead of a dead end
      router.push(roleHome[user.role as Role] ?? "/");
    }
  }, [user, isLoading, allowed, router]);

  if (isLoading || !allowed) {
    return <Loader />;
  }

  return <>{children}</>;
}
