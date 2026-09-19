"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/hooks/redux";
import { useLoadUserQuery } from "@/redux/features/auth/authApi";
import Loader from "./Loader";

export default function AdminProtected({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading } = useLoadUserQuery(undefined);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // wait for /me to resolve before deciding

    if (!user) {
      router.push("/login");
    } else if (user.role !== "admin") {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "admin") {
    return <Loader />;
  }

  return <>{children}</>;
}