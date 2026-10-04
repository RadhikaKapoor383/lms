"use client";

import Link from "next/link";
import { useFormik } from "formik";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { forgotPasswordSchema } from "@/utils/validationSchemas";
import { useForgotPasswordMutation } from "@/redux/features/auth/authApi";

export default function ForgotPasswordPage() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [serverError, setServerError] = useState("");
  const [sentTo, setSentTo] = useState("");

  const formik = useFormik({
    initialValues: { email: "" },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values) => {
      setServerError("");
      try {
        await forgotPassword(values.email.trim()).unwrap();
        setSentTo(values.email.trim());
      } catch (err: any) {
        setServerError(err?.data?.message || "Something went wrong");
      }
    },
  });

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <h1 className="font-display text-3xl text-ink dark:text-parchment">Forgot your password?</h1>

        {sentTo ? (
          <div className="mt-6 space-y-4 text-ink/80 dark:text-parchment/80">
            {/* Same wording whether or not the email has an account - on purpose */}
            <p>
              If an account exists for <span className="font-medium">{sentTo}</span>, we&apos;ve
              sent a link to reset the password. It works once and expires shortly.
            </p>
            <p className="text-sm text-ink/60 dark:text-parchment/60">
              Nothing in your inbox? Check spam, or wait a minute and try again.
            </p>
            <Link href="/login" className="inline-block text-mustard-dark hover:underline dark:text-mustard">
              Back to log in
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-ink/70 dark:text-parchment/70">
              Enter your email and we&apos;ll send you a link to choose a new one.
            </p>
            <form onSubmit={formik.handleSubmit} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="text-sm text-ink/70 dark:text-parchment/70">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.email}
                  className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
                />
                {formik.touched.email && formik.errors.email && (
                  <p className="mt-1 text-sm text-clay">{formik.errors.email}</p>
                )}
              </div>

              {serverError && <p className="text-sm text-clay">{serverError}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <p className="mt-6 text-sm text-ink/70 dark:text-parchment/70">
              Remembered it?{" "}
              <Link href="/login" className="text-mustard-dark hover:underline dark:text-mustard">
                Log in
              </Link>
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
