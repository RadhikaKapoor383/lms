"use client";

import { useState } from "react";
import Loader from "@/components/Loader";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
} from "@/redux/features/categories/categoriesApi";

export default function AdminCategoriesPage() {
  const { data, isLoading } = useGetCategoriesQuery(undefined);
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

  const categories = data?.categories || [];

  const handleCreate = async () => {
    setError("");
    const name = newName.trim();
    if (!name) return;
    try {
      await createCategory(name).unwrap();
      setNewName("");
    } catch (err: any) {
      setError(err?.data?.message || "Could not create the category");
    }
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = async () => {
    setError("");
    const name = editingName.trim();
    if (!editingId || !name) return;
    try {
      await updateCategory({ id: editingId, name }).unwrap();
      setEditingId(null);
    } catch (err: any) {
      setError(err?.data?.message || "Could not rename the category");
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await deleteCategory(id).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Could not delete the category");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Categories
      </h1>
      <p className="mt-1 text-ink/70 dark:text-parchment/70">
        These show up in the course creation form and (eventually) catalog filters.
      </p>

      {isLoading && <Loader />}
      {error && <p className="mt-3 text-sm text-clay">{error}</p>}

      {!isLoading && (
        <div className="mt-8 max-w-md space-y-3">
          {categories.map((c: any) => (
            <div key={c._id} className="flex items-center gap-2">
              {editingId === c._id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
                  />
                  <button onClick={saveEdit} className="text-sm text-mustard-dark hover:underline dark:text-mustard">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="px-2 text-sm text-ink/50 dark:text-parchment/50">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="w-full border border-transparent px-4 py-2.5 text-ink dark:text-parchment">
                    {c.name}
                  </span>
                  <button
                    onClick={() => startEdit(c._id, c.name)}
                    className="text-sm text-mustard-dark hover:underline dark:text-mustard"
                  >
                    Rename
                  </button>
                  <button onClick={() => handleDelete(c._id)} className="px-2 text-sm text-clay">
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}

          {categories.length === 0 && (
            <p className="text-sm text-ink/60 dark:text-parchment/60">
              No categories yet - add the first one below.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Programming"
              className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
              className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
