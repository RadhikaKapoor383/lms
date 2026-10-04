"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { loginSchema } from "@/utils/validationSchemas";
import { useLoginMutation } from "@/redux/features/auth/authApi";
import { Role, roleHome } from "@/types/role";

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const [serverError, setServerError] = useState("");

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      setServerError("");
      try {
        const result = await login(values).unwrap();
        // Each role lands on its own dashboard
        router.push(roleHome[result?.user?.role as Role] ?? "/");
      } catch (err: any) {
        setServerError(err?.data?.message || "Something went wrong");
      }
    },
  });

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <h1 className="font-display text-3xl text-ink dark:text-parchment">
          Welcome back
        </h1>
        <p className="mt-2 text-ink/70 dark:text-parchment/70">
          Log in to pick up where you left off.
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
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.email}
              className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
            />
            {formik.touched.email && formik.errors.email && (
              <p className="mt-1 text-sm text-clay">{formik.errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="text-sm text-ink/70 dark:text-parchment/70">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.password}
              className="mt-1 w-full border border-parchment-dark bg-transparent px-4 py-2.5 outline-none focus:border-mustard dark:border-ink-light"
            />
            {formik.touched.password && formik.errors.password && (
              <p className="mt-1 text-sm text-clay">{formik.errors.password}</p>
            )}
            <p className="mt-2 text-right text-sm">
              <Link
                href="/forgot-password"
                className="text-mustard-dark hover:underline dark:text-mustard"
              >
                Forgot password?
              </Link>
            </p>
          </div>

          {serverError && <p className="text-sm text-clay">{serverError}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink/70 dark:text-parchment/70">
          New here?{" "}
          <Link href="/sign-up" className="text-mustard-dark hover:underline dark:text-mustard">
            Create an account
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
