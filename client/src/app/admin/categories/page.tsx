"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import {
  useCreateLayoutMutation,
  useEditLayoutMutation,
  useGetLayoutByTypeQuery,
} from "@/redux/features/layout/layoutApi";

export default function AdminCategoriesPage() {
  const { data, isLoading } = useGetLayoutByTypeQuery("Categories");
  const [createLayout, { isLoading: isCreating }] = useCreateLayoutMutation();
  const [editLayout, { isLoading: isEditing }] = useEditLayoutMutation();

  const [categories, setCategories] = useState<{ title: string }[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Populate local state once the existing categories load
  useEffect(() => {
    if (data?.layout?.categories?.length) {
      setCategories(data.layout.categories);
    }
  }, [data]);

  const updateCategory = (index: number, title: string) => {
    setCategories((c) => {
      const next = [...c];
      next[index] = { title };
      return next;
    });
    setSaved(false);
  };

  const addCategory = () => setCategories((c) => [...c, { title: "" }]);
  const removeCategory = (index: number) =>
    setCategories((c) => c.filter((_, i) => i !== index));

  const handleSave = async () => {
    setError("");
    setSaved(false);
    const cleaned = categories.filter((c) => c.title.trim() !== "");

    try {
      if (data?.layout?._id) {
        await editLayout({ type: "Categories", categories: cleaned }).unwrap();
      } else {
        await createLayout({ type: "Categories", categories: cleaned }).unwrap();
      }
      setSaved(true);
    } catch (err: any) {
      setError(err?.data?.message || "Could not save categories");
    }
  };

  const isSaving = isCreating || isEditing;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Categories
      </h1>
      <p className="mt-1 text-ink/70 dark:text-parchment/70">
        These show up in the course creation form and (eventually) catalog filters.
      </p>

      {isLoading && <Loader />}

      {!isLoading && (
        <div className="mt-8 max-w-md space-y-3">
          {categories.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={c.title}
                onChange={(e) => updateCategory(i, e.target.value)}
                className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
                placeholder="e.g. Programming"
              />
              <button onClick={() => removeCategory(i)} className="px-3 text-clay">
                Remove
              </button>
            </div>
          ))}

          <button
            onClick={addCategory}
            className="text-sm text-mustard-dark hover:underline dark:text-mustard"
          >
            + Add category
          </button>

          {error && <p className="text-sm text-clay">{error}</p>}
          {saved && (
            <p className="text-sm text-ink-light dark:text-mustard">Saved.</p>
          )}

          <div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="mt-2 rounded-full bg-mustard px-6 py-2.5 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save categories"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}