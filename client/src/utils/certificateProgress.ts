// What a student still has to do for a course's certificate, as short lines
// for the banner on the lesson page. Takes the server's certificate status.

export const pendingSteps = (status: any): string[] => {
  if (!status || status.certificate) return [];
  const steps: string[] = [];
  const required = typeof status.requiredLessonPercent === "number" ? status.requiredLessonPercent : 100;
  if (!status.lessonsComplete) {
    const now = Math.round(status.completionPercentage || 0);
    steps.push(
      required >= 100
        ? `Finish every lesson (you're at ${now}%)`
        : `Finish at least ${required}% of the lessons (you're at ${now}%)`
    );
  }
  for (const q of status.pendingQuizzes || []) steps.push(`Pass the quiz "${q.title}"`);
  for (const a of status.pendingAssignments || []) {
    steps.push(
      a.reason === "not submitted"
        ? `Submit the assignment "${a.title}"`
        : a.reason === "not graded yet"
          ? `Wait for "${a.title}" to be graded`
          : `Score the pass mark on "${a.title}" (resubmit if allowed)`
    );
  }
  return steps;
};
