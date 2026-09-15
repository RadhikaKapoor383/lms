"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import { useGetLayoutByTypeQuery } from "@/redux/features/layout/layoutApi";

export default function FaqPage() {
  const { data, isLoading } = useGetLayoutByTypeQuery("FAQ");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqItems = data?.layout?.faq || [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-4xl text-ink dark:text-parchment">
          Frequently asked questions
        </h1>

        {isLoading && <Loader />}

        {!isLoading && faqItems.length === 0 && (
          <p className="mt-6 text-ink/70 dark:text-parchment/70">
            No FAQ entries yet — add some from the admin dashboard once it's built.
          </p>
        )}

        <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
          {faqItems.map((item: any, i: number) => (
            <div key={item._id || i} className="py-4">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between text-left font-display text-lg text-ink dark:text-parchment"
              >
                {item.question}
                <span className="ml-4 text-mustard">{openIndex === i ? "–" : "+"}</span>
              </button>
              {openIndex === i && (
                <p className="mt-2 text-ink/70 dark:text-parchment/70">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
