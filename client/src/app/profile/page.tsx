"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/hooks/redux";
import {
  useConfirmEmailChangeMutation,
  useRequestEmailChangeMutation,
  useUpdatePasswordMutation,
  useUpdateProfileMutation,
} from "@/redux/features/users/usersApi";
import PasswordInput from "@/components/PasswordInput";

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

  // ---- change password ----
  const [updatePassword, { isLoading: isUpdatingPassword }] = useUpdatePasswordMutation();
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");

  const closePasswordForm = () => {
    setPwOpen(false);
    setOldPassword("");
    setNewPassword("");
    setPwError("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    try {
      await updatePassword({ oldPassword, newPassword }).unwrap();
      closePasswordForm();
      setMessage("Your password was changed.");
    } catch (err: any) {
      setPwError(err?.data?.message || "Could not change your password");
    }
  };

  // ---- change email: ask, then confirm with the code mailed to the new address ----
  const [requestEmailChange, { isLoading: isRequesting }] = useRequestEmailChangeMutation();
  const [confirmEmailChange, { isLoading: isConfirming }] = useConfirmEmailChangeMutation();
  const [emailStep, setEmailStep] = useState<"closed" | "request" | "code">("closed");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailToken, setEmailToken] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailError, setEmailError] = useState("");

  const closeEmailForm = () => {
    setEmailStep("closed");
    setNewEmail("");
    setEmailPassword("");
    setEmailToken("");
    setEmailCode("");
    setEmailError("");
  };

  const handleRequestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    try {
      const res: any = await requestEmailChange({ newEmail, password: emailPassword }).unwrap();
      setEmailToken(res.emailChangeToken);
      setEmailPassword("");
      setEmailStep("code");
    } catch (err: any) {
      setEmailError(err?.data?.message || "Could not start the email change");
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    try {
      await confirmEmailChange({ token: emailToken, code: emailCode }).unwrap();
      closeEmailForm();
      setMessage("Your email was changed.");
    } catch (err: any) {
      setEmailError(err?.data?.message || "Could not confirm the code");
    }
  };

  const inputClass =
    "mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light";
  // same look, without the top margin (PasswordInput's wrapper already has it)
  const fieldClass =
    "w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light";

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

            <div className="mt-6">
              {emailStep === "closed" && (
                <button
                  onClick={() => {
                    setMessage("");
                    setEmailStep("request");
                  }}
                  className="text-sm text-mustard-dark hover:underline dark:text-mustard"
                >
                  Change email
                </button>
              )}

              {emailStep === "request" && (
                <form onSubmit={handleRequestEmail} className="space-y-4 border border-parchment-dark p-5 dark:border-ink-light">
                  <p className="text-sm text-ink/70 dark:text-parchment/70">
                    We&apos;ll send a code to your new address. Your email only changes after you enter it.
                  </p>
                  <div>
                    <label htmlFor="new-email" className="text-sm text-ink/70 dark:text-parchment/70">New email</label>
                    <input
                      id="new-email"
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-ink/70 dark:text-parchment/70">Current password</label>
                    <PasswordInput
                      value={emailPassword}
                      required
                      autoComplete="current-password"
                      className={fieldClass}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailPassword(e.target.value)}
                      placeholder="Your current password"
                    />
                  </div>
                  {emailError && <p className="text-sm text-clay">{emailError}</p>}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={isRequesting}
                      className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                    >
                      {isRequesting ? "Sending..." : "Send code"}
                    </button>
                    <button type="button" onClick={closeEmailForm} className="text-sm text-ink/60 dark:text-parchment/60">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {emailStep === "code" && (
                <form onSubmit={handleConfirmEmail} className="space-y-4 border border-parchment-dark p-5 dark:border-ink-light">
                  <p className="text-sm text-ink/70 dark:text-parchment/70">
                    Enter the 6-digit code we sent to {newEmail}. It works for 15 minutes.
                  </p>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                    aria-label="Confirmation code"
                    className={inputClass}
                  />
                  {emailError && <p className="text-sm text-clay">{emailError}</p>}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={isConfirming || emailCode.length !== 6}
                      className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                    >
                      {isConfirming ? "Checking..." : "Confirm email"}
                    </button>
                    <button type="button" onClick={closeEmailForm} className="text-sm text-ink/60 dark:text-parchment/60">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="mt-4">
              {!pwOpen ? (
                <button
                  onClick={() => {
                    setMessage("");
                    setPwOpen(true);
                  }}
                  className="text-sm text-mustard-dark hover:underline dark:text-mustard"
                >
                  Change password
                </button>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4 border border-parchment-dark p-5 dark:border-ink-light">
                  <div>
                    <label className="text-sm text-ink/70 dark:text-parchment/70">Current password</label>
                    <PasswordInput
                      required
                      autoComplete="current-password"
                      className={fieldClass}
                      value={oldPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-ink/70 dark:text-parchment/70">New password (at least 8 characters)</label>
                    <PasswordInput
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={fieldClass}
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                    />
                  </div>
                  {pwError && <p className="text-sm text-clay">{pwError}</p>}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
                    >
                      {isUpdatingPassword ? "Saving..." : "Change password"}
                    </button>
                    <button type="button" onClick={closePasswordForm} className="text-sm text-ink/60 dark:text-parchment/60">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

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
