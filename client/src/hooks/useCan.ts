"use client";

import { useAppSelector } from "./redux";
import { useGetMyPermissionsQuery } from "@/redux/features/permissions/permissionsApi";
import { canWith } from "@/utils/permissions";

// can("quiz.manage") - whether the signed-in user's role may do this, so the
// website can hide buttons that would only end in "not allowed". The server
// checks again on every request; this only keeps the page tidy.
export const useCan = () => {
  const user = useAppSelector((state) => state.auth.user);
  const { data } = useGetMyPermissionsQuery(undefined, { skip: !user || user.role === "admin" });
  return (key: string): boolean => (!user || user.role === "admin" ? true : canWith(data, key));
};
