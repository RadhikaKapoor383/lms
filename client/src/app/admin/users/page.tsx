"use client";

import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useDeleteUserAdminMutation,
  useGetAllUsersAdminQuery,
  useSetUserActiveMutation,
  useUpdateUserRoleMutation,
} from "@/redux/features/users/usersApi";
import { useAppSelector } from "@/hooks/redux";
import { ROLES } from "@/types/role";

const roles = ROLES;

export default function AdminUsersPage() {
  const { data, isLoading } = useGetAllUsersAdminQuery(undefined);
  const [updateRole] = useUpdateUserRoleMutation();
  const [deleteUser] = useDeleteUserAdminMutation();
  const [setUserActive] = useSetUserActiveMutation();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState("");

  const handleRoleChange = async (id: string, role: string) => {
    setRoleError("");
    try {
      await updateRole({ id, role }).unwrap();
    } catch (err: any) {
      setRoleError(err?.data?.message || "Could not change the role");
    }
  };

  const handleActive = async (u: any) => {
    const deactivating = u.isActive !== false;
    if (
      deactivating &&
      !window.confirm(`Deactivate ${u.name}? They will be signed out everywhere and can't log in until you reactivate them.`)
    ) {
      return;
    }
    setRoleError("");
    try {
      await setUserActive({ id: u._id, active: !deactivating }).unwrap();
    } catch (err: any) {
      setRoleError(err?.data?.message || "Could not change the account status");
    }
  };

  const users = data?.users || [];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Users</h1>

      {isLoading && <Loader />}
      {roleError && <p className="mt-3 text-sm text-clay">{roleError}</p>}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {users.map((u: any) => (
          <div
            key={u._id}
            className={`flex items-center justify-between py-4 ${u.isActive === false ? "opacity-60" : ""}`}
          >
            <div>
              <p className="font-medium text-ink dark:text-parchment">
                {u.name}
                {u.isActive === false && (
                  <span className="ml-3 rounded-full bg-clay/20 px-2.5 py-0.5 text-xs font-normal text-clay">
                    Deactivated
                  </span>
                )}
              </p>
              <p className="text-sm text-ink/60 dark:text-parchment/60">{u.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={u.role}
                disabled={u._id === currentUser?._id}
                onChange={(e) => handleRoleChange(u._id, e.target.value)}
                className="border border-parchment-dark bg-transparent px-2 py-1 text-sm dark:border-ink-light"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {u._id !== currentUser?._id && (
                <button
                  onClick={() => handleActive(u)}
                  className="text-sm text-mustard-dark hover:underline dark:text-mustard"
                >
                  {u.isActive === false ? "Activate" : "Deactivate"}
                </button>
              )}

              {u._id === currentUser?._id ? (
                <span className="text-sm text-ink/40 dark:text-parchment/40">You</span>
              ) : confirmId === u._id ? (
                <>
                  <button onClick={() => deleteUser(u._id)} className="text-sm text-clay">
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-sm text-ink/50 dark:text-parchment/50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmId(u._id)}
                  className="text-sm text-clay hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}