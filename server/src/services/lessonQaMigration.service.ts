// Turning one old lesson question (stored inside the lesson, with its answers)
// into a Discussion thread about that lesson. No database in here, so it can be
// tested on its own; src/migrate-lesson-questions.ts does the reading/writing.

export const MAX_TITLE = 150; // same limits as a thread started on the site
export const MAX_BODY = 5000;

const ROLES = ["student", "instructor", "admin"];

export interface IOldQuestion {
  _id?: any;
  user?: any; // a snapshot of the asker: { _id, name, role, ... }
  question?: string;
  createdAt?: Date | string;
  questionReplies?: { user?: any; answer?: string; createdAt?: Date | string }[];
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const when = (v: unknown, fallback: Date) => {
  const d = v ? new Date(v as any) : null;
  return d && !Number.isNaN(+d) ? d : fallback;
};
// the snapshot's role, or (for very old snapshots without one) the role the
// account has now, or "student"
const roleOf = (snap: any, currentRoles: Map<string, string>) => {
  const r = snap?.role || currentRoles.get(String(snap?._id || ""));
  return ROLES.includes(r) ? r : "student";
};

// Returns null for a question that can't become a thread (no text or no asker).
export const questionToThread = (
  q: IOldQuestion,
  lesson: { _id: any; course: any; title?: string },
  currentRoles: Map<string, string>,
  fallbackDate: Date
) => {
  const text = String(q.question || "").trim();
  if (!text || !q.user?._id) return null;

  const createdAt = when(q.createdAt, fallbackDate);
  const replies = (q.questionReplies || [])
    .filter((r) => String(r.answer || "").trim() && r.user?._id)
    .map((r) => ({
      author: r.user._id,
      authorName: r.user.name || "Someone",
      authorRole: roleOf(r.user, currentRoles),
      body: clip(String(r.answer).trim(), MAX_BODY),
      createdAt: when(r.createdAt, createdAt),
    }));
  const lastActivityAt = replies.reduce((latest, r) => (r.createdAt > latest ? r.createdAt : latest), createdAt);

  // the first line of the question makes the title
  const firstLine = text.split(/\r?\n/)[0].trim();
  return {
    course: lesson.course,
    lesson: lesson._id,
    migratedFrom: `lesson-question:${lesson._id}:${q._id ?? text.slice(0, 40)}`,
    author: q.user._id,
    authorName: q.user.name || "Student",
    authorRole: roleOf(q.user, currentRoles),
    title: clip(firstLine, MAX_TITLE),
    body: clip(text, MAX_BODY),
    pinned: false,
    replies,
    lastActivityAt,
    createdAt,
    updatedAt: lastActivityAt,
  };
};
