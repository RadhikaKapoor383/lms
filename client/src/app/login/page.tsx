"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { useState } from "react";
import { loginSchema } from "@/utils/validationSchemas";
import { useLoginMutation } from "@/redux/features/auth/authApi";
import { Role, roleHome } from "@/types/role";
import PasswordInput from "@/components/PasswordInput";
import { useAppSelector } from "@/hooks/redux";
import AuthShell from "@/components/AuthShell";
import AuthField, { MailIcon, LockIcon, authInputClass } from "@/components/AuthField";
import AuthSubmit from "@/components/AuthSubmit";

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const [serverError, setServerError] = useState("");
  // set when the system logged you out (inactive too long / session time cap)
  const endedReason = useAppSelector((state) => state.auth.endedReason);

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
    <AuthShell
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      panelTitle="Your next lesson is waiting."
      panelPoints={[
        "Continue from the exact lesson you left",
        "See your real progress in every course",
        "Download the certificates you've earned",
      ]}
    >
      {endedReason && (
        <p
          role="status"
          className="mt-4 border border-mustard/50 bg-mustard/10 px-4 py-3 text-sm text-ink dark:text-parchment"
        >
          {endedReason}
        </p>
      )}

      <form onSubmit={formik.handleSubmit} className="mt-8 space-y-5" noValidate>
        <AuthField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          icon={<MailIcon />}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.email}
          error={formik.touched.email ? formik.errors.email : undefined}
        />

        <div>
          <label htmlFor="password" className="text-sm text-ink/70 dark:text-parchment/70">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            icon={<LockIcon />}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.password}
            className={authInputClass}
          />
          {formik.touched.password && formik.errors.password && (
            <p role="alert" className="mt-1 text-sm text-clay">
              {formik.errors.password}
            </p>
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

        {serverError && (
          <p
            role="alert"
            className="animate-shake border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay"
          >
            {serverError}
          </p>
        )}

        <AuthSubmit loading={isLoading} idleLabel="Log in" loadingLabel="Logging in..." />
      </form>

      <p className="mt-6 text-sm text-ink/70 dark:text-parchment/70">
        New here?{" "}
        <Link href="/sign-up" className="text-mustard-dark hover:underline dark:text-mustard">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
