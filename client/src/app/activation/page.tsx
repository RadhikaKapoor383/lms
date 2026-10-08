"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAppSelector } from "@/hooks/redux";
import { useActivationMutation } from "@/redux/features/auth/authApi";

const CODE_LENGTH = 6;

export default function ActivationPage() {
  const router = useRouter();
  const { token } = useAppSelector((state) => state.auth);
  const [activation, { isLoading }] = useActivationMutation();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const activation_code = digits.join("");

    if (activation_code.length !== CODE_LENGTH) {
      setError(`Enter the full ${CODE_LENGTH}-digit code`);
      return;
    }

    if (!token) {
      setError("Your registration session expired — please sign up again.");
      return;
    }

    try {
      const res: any = await activation({ activation_token: token, activation_code }).unwrap();
      setPendingApproval(!!res?.pendingApproval);
      setSuccess(true);
      // Someone waiting for approval can't log in yet, so give them time to read why.
      setTimeout(() => router.push("/login"), res?.pendingApproval ? 6000 : 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Invalid or expired code");
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <h1 className="font-display text-3xl text-ink dark:text-parchment">
          Check your email
        </h1>
        <p className="mt-2 text-ink/70 dark:text-parchment/70">
          Enter the 6-digit code we just sent you. It expires in 5 minutes.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="flex justify-between gap-2">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                className="h-12 w-12 border border-parchment-dark bg-transparent text-center font-display text-2xl outline-none focus:border-mustard dark:border-ink-light"
              />
            ))}
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}
          {success && (
            <p className="text-sm text-ink-light dark:text-mustard">
              {pendingApproval
                ? "Email verified. An administrator needs to approve your account before you can log in - we'll email you as soon as it's done."
                : "Account activated — redirecting to login..."}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-mustard px-6 py-3 font-medium text-ink hover:bg-mustard-dark disabled:opacity-60"
          >
            {isLoading ? "Verifying..." : "Verify account"}
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}
