"use client";

import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetDepartmentsQuery,
  useUpdateDepartmentMutation,
} from "@/redux/features/departments/departmentsApi";

const inputClass =
  "w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function AdminDepartmentsPage() {
  const { data, isLoading, isError } = useGetDepartmentsQuery(undefined);
  const [createDepartment, { isLoading: isCreating }] = useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: isSaving }] = useUpdateDepartmentMutation();
  const [deleteDepartment] = useDeleteDepartmentMutation();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const departments: any[] = data?.departments || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const name = newName.trim();
    if (!name) return;
    try {
      await createDepartment(name).unwrap();
      setNewName("");
    } catch (err: any) {
      setError(err?.data?.message || "Could not create the department");
    }
  };

  const saveEdit = async () => {
    setError("");
    const name = editingName.trim();
    if (!editingId || !name) return;
    try {
      await updateDepartment({ id: editingId, name }).unwrap();
      setEditingId(null);
    } catch (err: any) {
      setError(err?.data?.message || "Could not rename the department");
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await deleteDepartment(id).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not delete the department");
    }
    setConfirmId(null);
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Departments</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Group courses and instructors by department. Students can filter the catalogue by it, and
        an instructor&apos;s new course goes into their department unless they pick another. Put
        instructors in a department under Instructors.
      </p>

      {isLoading && <Loader />}
      {isError && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load departments.</p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-clay">
          {error}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="mt-8 max-w-2xl">
          {departments.length === 0 ? (
            <p className="text-sm text-ink/60 dark:text-parchment/60">
              No departments yet - add the first one below.
            </p>
          ) : (
            <ul className="divide-y divide-parchment-dark dark:divide-ink-light">
              {departments.map((d) => {
                const inUse = d.courseCount + d.instructorCount;
                return (
                  <li key={d._id} className="flex flex-wrap items-center gap-3 py-3">
                    {editingId === d._id ? (
                      <>
                        <input
                          autoFocus
                          aria-label={`New name for ${d.name}`}
                          value={editingName}
                          maxLength={80}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className={`${inputClass} flex-1`}
                        />
                        <button
                          onClick={saveEdit}
                          disabled={isSaving || !editingName.trim()}
                          className="text-sm text-mustard-dark hover:underline disabled:opacity-50 dark:text-mustard"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 text-sm text-ink/50 dark:text-parchment/50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-ink dark:text-parchment">{d.name}</p>
                          <p className="text-xs text-ink/60 dark:text-parchment/60">
                            {plural(d.courseCount, "course")} · {plural(d.instructorCount, "instructor")}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingId(d._id);
                            setEditingName(d.name);
                            setConfirmId(null);
                          }}
                          className="text-sm text-mustard-dark hover:underline dark:text-mustard"
                        >
                          Rename
                        </button>
                        {confirmId === d._id ? (
                          <>
                            <button onClick={() => handleDelete(d._id)} className="text-sm font-medium text-clay">
                              Confirm delete
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="px-2 text-sm text-ink/50 dark:text-parchment/50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmId(d._id)}
                            disabled={inUse > 0}
                            title={inUse > 0 ? "Move its courses and instructors to another department first" : undefined}
                            className="px-2 text-sm text-clay disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleCreate} className="mt-6 flex gap-2">
            <input
              value={newName}
              maxLength={80}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Computer Science"
              aria-label="New department name"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={isCreating || !newName.trim()}
              className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
