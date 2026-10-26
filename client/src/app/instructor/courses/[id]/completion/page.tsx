"use client";

import { useParams } from "next/navigation";
import CompletionRulesForm from "@/components/CompletionRulesForm";

export default function CourseCompletionRulesPage() {
  const params = useParams();
  const courseId = params?.id as string;
  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Completion rules</h1>
      <p className="mt-2 mb-8 text-sm text-ink/60 dark:text-parchment/60">
        What a student must do for this course to count as completed and earn its certificate.
      </p>
      <CompletionRulesForm courseId={courseId} />
    </div>
  );
}
