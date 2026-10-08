"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/redux/features/admin/adminApi";

const Toggle = ({
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) => (
  <div className="flex items-start justify-between gap-6 py-5">
    <div>
      <p className="font-medium text-ink dark:text-parchment">{label}</p>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">{help}</p>
    </div>
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-mustard" : "bg-parchment-dark dark:bg-ink-light"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  </div>
);

export default function AdminSettingsPage() {
  const { data, isLoading, isError } = useGetSettingsQuery(undefined);
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();
  const settings = data?.settings;

  const [platformName, setPlatformName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (settings) setPlatformName(settings.platformName);
  }, [settings]);

  const save = async (changes: Record<string, unknown>, okMessage = "Saved.") => {
    setError("");
    setMessage("");
    try {
      await updateSettings(changes).unwrap();
      setMessage(okMessage);
    } catch (err: any) {
      setError(err?.data?.message || "Could not save the settings");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Settings</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">Platform-wide switches. Changes apply straight away.</p>

      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load the settings.</p>}
      {error && <p className="mt-4 text-sm text-clay">{error}</p>}
      {message && <p className="mt-4 text-sm text-ink/70 dark:text-parchment/70">{message}</p>}

      {settings && (
        <div className="mt-6 max-w-2xl divide-y divide-parchment-dark dark:divide-ink-light">
          <div className="py-5">
            <label htmlFor="platformName" className="font-medium text-ink dark:text-parchment">
              Platform name
            </label>
            <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
              Printed on certificates issued from now on. Certificates already issued keep the name they were issued with.
            </p>
            <div className="mt-3 flex gap-3">
              <input
                id="platformName"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                maxLength={60}
                className="w-72 border border-parchment-dark bg-transparent px-3 py-2 outline-none focus:border-mustard dark:border-ink-light"
              />
              <button
                onClick={() => save({ platformName })}
                disabled={isSaving || platformName.trim() === settings.platformName}
                className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>

          <Toggle
            label="Require approval for new courses"
            help="On: instructors submit courses and an admin approves them before they go live. Off: submitting publishes the course straight away."
            checked={settings.requireCourseApproval}
            disabled={isSaving}
            onChange={(value) => save({ requireCourseApproval: value })}
          />
          <Toggle
            label="Allow student self-enrollment"
            help="On: students can enroll themselves (free courses, or with an enrollment code). Off: only instructors and admins can enroll people."
            checked={settings.allowSelfEnrollment}
            disabled={isSaving}
            onChange={(value) => save({ allowSelfEnrollment: value })}
          />
          <Toggle
            label="Require approval for new students"
            help="On: a new student can verify their email, but cannot log in until an admin approves the account (you'll see them under Users). Off: verifying the email is enough."
            checked={!!settings.requireStudentApproval}
            disabled={isSaving}
            onChange={(value) => save({ requireStudentApproval: value })}
          />
        </div>
      )}
    </div>
  );
}
