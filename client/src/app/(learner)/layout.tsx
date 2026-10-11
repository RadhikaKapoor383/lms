import LearnerShell from "@/components/LearnerShell";

// Every page in this folder gets the same frame. A student sees the student
// sidebar next to the page; everyone else sees the plain navbar + footer.
// (The folder name in brackets is only for grouping - it is not part of any URL.)
export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return <LearnerShell>{children}</LearnerShell>;
}
