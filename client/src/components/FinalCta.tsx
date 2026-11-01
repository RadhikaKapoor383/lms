"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useAppSelector } from "@/hooks/redux";

interface FinalCtaProps {
  heading?: string;
  text?: string;
}

export default function FinalCta({
  heading = "Pick one course. Finish it",
  text = "That's the whole idea. Start with a single path and see it through to the certificate.",
}: FinalCtaProps) {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <section className="bg-ink text-parchment">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <Reveal>
          <h2 className="font-display text-3xl md:text-5xl">
            {heading}
            <span className="text-mustard">.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-prose text-parchment/80">{text}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/courses"
              className="rounded-full bg-mustard px-6 py-3 font-medium text-ink transition hover:-translate-y-0.5 hover:bg-mustard-dark"
            >
              Browse courses
            </Link>
            {!user && (
              <Link
                href="/sign-up"
                className="rounded-full border border-parchment/30 px-6 py-3 font-medium text-parchment transition hover:-translate-y-0.5 hover:border-mustard hover:text-mustard"
              >
                Create your account
              </Link>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
