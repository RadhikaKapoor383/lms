"use client";

import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useDeleteUserAdminMutation,
  useGetAllUsersAdminQuery,
  useSetUserActiveMutation,
  useSetUserApprovalMutation,
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
  const [setUserApproval] = useSetUserApprovalMutation();
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

  const handleApproval = async (u: any, approve: boolean) => {
    if (
      !approve &&
      !window.confirm(`Reject ${u.name}? They won't be able to log in. (Delete the account afterwards if they should be able to sign up again.)`)
    ) {
      return;
    }
    setRoleError("");
    try {
      const res: any = await setUserApproval({ id: u._id, approve }).unwrap();
      if (res?.emailSent === false) {
        setRoleError(`Saved, but the email to ${u.email} could not be sent.`);
      }
    } catch (err: any) {
      setRoleError(err?.data?.message || "Could not save the decision");
    }
  };

  // students waiting for a decision come first
  const users = [...(data?.users || [])].sort(
    (a: any, b: any) =>
      Number(b.approvalStatus === "pending") - Number(a.approvalStatus === "pending")
  );
  const pendingCount = users.filter((u: any) => u.approvalStatus === "pending").length;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Users</h1>

      {pendingCount > 0 && (
        <p className="mt-3 text-sm text-mustard-dark dark:text-mustard">
          {pendingCount} student{pendingCount === 1 ? " is" : "s are"} waiting for your approval.
        </p>
      )}

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
                {u.approvalStatus === "pending" && (
                  <span className="ml-3 rounded-full bg-mustard/20 px-2.5 py-0.5 text-xs font-normal text-mustard-dark dark:text-mustard">
                    Pending approval
                  </span>
                )}
                {u.approvalStatus === "rejected" && (
                  <span className="ml-3 rounded-full bg-clay/20 px-2.5 py-0.5 text-xs font-normal text-clay">
                    Rejected
                  </span>
                )}
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

              {u.approvalStatus === "pending" && (
                <>
                  <button
                    onClick={() => handleApproval(u, true)}
                    className="text-sm font-medium text-mustard-dark hover:underline dark:text-mustard"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(u, false)}
                    className="text-sm text-clay hover:underline"
                  >
                    Reject
                  </button>
                </>
              )}

              {u._id !== currentUser?._id && u.approvalStatus !== "pending" && (
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