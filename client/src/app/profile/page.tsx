"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/hooks/redux";
import { useUpdateProfileMutation } from "@/redux/features/users/usersApi";

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState(""); // comma separated while typing
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // fill the form from the saved profile whenever it opens
  useEffect(() => {
    if (editing && user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setExpertise((user.expertise || []).join(", "));
    }
  }, [editing, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await updateProfile({
        name,
        bio,
        expertise: expertise.split(",").map((t) => t.trim()).filter(Boolean),
      }).unwrap();
      setEditing(false);
      setMessage("Profile saved.");
    } catch (err: any) {
      setError(err?.data?.message || "Could not save your profile");
    }
  };

  const inputClass =
    "mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16">
        {!user ? (
          <p className="text-ink/70 dark:text-parchment/70">
            You need to be logged in to view this page.
          </p>
        ) : (
          <>
            <h1 className="font-display text-4xl text-ink dark:text-parchment">
              {user.name}
            </h1>
            <p className="mt-2 text-ink/70 dark:text-parchment/70">{user.email}</p>

            {message && <p className="mt-3 text-sm text-ink/70 dark:text-parchment/70">{message}</p>}

            {!editing ? (
              <div className="mt-6">
                {user.bio ? (
                  <p className="max-w-prose text-ink/80 dark:text-parchment/80">{user.bio}</p>
                ) : (
                  <p className="text-ink/50 dark:text-parchment/50">You haven&apos;t written a bio yet.</p>
                )}
                {user.expertise?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.expertise.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full bg-mustard/20 px-3 py-1 text-xs text-mustard-dark dark:text-mustard"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    setMessage("");
                    setEditing(true);
                  }}
                  className="mt-4 text-sm text-mustard-dark hover:underline dark:text-mustard"
                >
                  Edit profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} className="mt-6 space-y-4 border border-parchment-dark p-5 dark:border-ink-light">
                <div>
                  <label htmlFor="profile-name" className="text-sm text-ink/70 dark:text-parchment/70">Name</label>
                  <input
                    id="profile-name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="profile-bio" className="text-sm text-ink/70 dark:text-parchment/70">
                    Bio ({bio.length}/500)
                  </label>
                  <textarea
                    id="profile-bio"
                    rows={4}
                    maxLength={500}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="profile-expertise" className="text-sm text-ink/70 dark:text-parchment/70">
                    {user.role === "instructor" ? "Expertise" : "Interests"} (comma separated, up to 10)
                  </label>
                  <input
                    id="profile-expertise"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    placeholder="React, TypeScript, Databases"
                    className={inputClass}
                  />
                </div>
                {error && <p className="text-sm text-clay">{error}</p>}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setError("");
                    }}
                    className="text-sm text-ink/60 dark:text-parchment/60"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="mt-10">
              <h2 className="font-display text-2xl text-ink dark:text-parchment">
                Enrolled courses
              </h2>
              {user.courses?.length ? (
                <ul className="mt-4 space-y-2">
                  {user.courses.map((c: any, i: number) => (
                    <li key={i} className="text-ink/80 dark:text-parchment/80">
                      — Course ID: {c.courseId}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-ink/60 dark:text-parchment/60">
                  You haven&apos;t enrolled in anything yet.
                </p>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
