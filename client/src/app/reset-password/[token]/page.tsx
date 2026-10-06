"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormik } from "formik";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { resetPasswordSchema } from "@/utils/validationSchemas";
import { useResetPasswordMutation } from "@/redux/features/auth/authApi";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const params = useParams();
  const token = params?.token as string;

  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);

  const formik = useFormik({
    initialValues: { password: "", confirmPassword: "" },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values) => {
      setServerError("");
      try {
        await resetPassword({ token, password: values.password }).unwrap();
        setDone(true);
      } catch (err: any) {
        setServerError(err?.data?.message || "Something went wrong");
      }
    },
  });

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        {done ? (
          <div className="space-y-4">
            <h1 className="font-display text-3xl text-ink dark:text-parchment">Password updated</h1>
            <p className="text-ink/80 dark:text-parchment/80">
              You&apos;ve been signed out everywhere. Log in with your new password.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark"
            >
              Go to log in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl text-ink dark:text-parchment">Choose a new password</h1>
            <p className="mt-2 text-ink/70 dark:text-parchment/70">
              Pick something you haven&apos;t used before.
            </p>

            <form onSubmit={formik.handleSubmit} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="password" className="text-sm text-ink/70 dark:text-parchment/70">
                  New password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                  className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
                />
                {formik.touched.password && formik.errors.password && (
                  <p className="mt-1 text-sm text-clay">{formik.errors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="text-sm text-ink/70 dark:text-parchment/70">
                  Confirm new password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.confirmPassword}
                  className="w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
                />
                {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-clay">{formik.errors.confirmPassword}</p>
                )}
              </div>

              {serverError && (
                <p className="text-sm text-clay">
                  {serverError}{" "}
                  <Link href="/forgot-password" className="underline">
                    Request a new link
                  </Link>
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
              >
                {isLoading ? "Saving..." : "Reset password"}
              </button>
            </form>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
