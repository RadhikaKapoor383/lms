"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { useState } from "react";
import { registerSchema } from "@/utils/validationSchemas";
import { useRegisterMutation } from "@/redux/features/auth/authApi";
import PasswordInput from "@/components/PasswordInput";
import AuthShell from "@/components/AuthShell";
import AuthField, { MailIcon, UserIcon, LockIcon, authInputClass } from "@/components/AuthField";
import AuthSubmit from "@/components/AuthSubmit";
import PasswordStrength from "@/components/PasswordStrength";

export default function SignUpPage() {
  const router = useRouter();
  const [register, { isLoading }] = useRegisterMutation();
  const [serverError, setServerError] = useState("");

  const formik = useFormik({
    initialValues: { name: "", email: "", password: "" },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      setServerError("");
      try {
        await register(values).unwrap();
        router.push("/activation");
      } catch (err: any) {
        setServerError(err?.data?.message || "Something went wrong");
      }
    },
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="We'll email you a code to activate it."
      panelTitle="Start your first path today."
      panelPoints={[
        "Create your account in under a minute",
        "Activate it with the code we email you",
        "Pick a course and start learning",
      ]}
    >
      <form onSubmit={formik.handleSubmit} className="mt-8 space-y-5" noValidate>
        <AuthField
          id="name"
          name="name"
          type="text"
          label="Name"
          autoComplete="name"
          icon={<UserIcon />}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.name}
          error={formik.touched.name ? formik.errors.name : undefined}
        />

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
            autoComplete="new-password"
            icon={<LockIcon />}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.password}
            className={authInputClass}
          />
          {formik.touched.password && formik.errors.password ? (
            <p role="alert" className="mt-1 text-sm text-clay">
              {formik.errors.password}
            </p>
          ) : (
            <PasswordStrength password={formik.values.password} />
          )}
        </div>

        {serverError && (
          <p
            role="alert"
            className="animate-shake border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay"
          >
            {serverError}
          </p>
        )}

        <AuthSubmit loading={isLoading} idleLabel="Create account" loadingLabel="Creating account..." />
      </form>

      <p className="mt-6 text-sm text-ink/70 dark:text-parchment/70">
        Already have an account?{" "}
        <Link href="/login" className="text-mustard-dark hover:underline dark:text-mustard">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
