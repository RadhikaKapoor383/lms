// Anything stored with a user snapshot (reviews, lesson questions) used to keep
// the WHOLE logged-in user object - email, role, course list and all - and send
// it back to whoever fetched the course. These helpers cut a user, a review, or
// a question down to what other people are allowed to see: who wrote it.
//
// They are applied when RESPONDING, not when saving, so they also clean up data
// that was stored before this fix, with no migration. (Lesson questions keep
// the email in the database on purpose: the "your question was answered" email
// needs it. It just never leaves the server.)

export const toPublicUser = (u: any) =>
  u
    ? { _id: u._id, name: u.name, avatar: u.avatar, role: u.role }
    : undefined;

export const toPublicReview = (r: any) => ({
  _id: r._id,
  user: toPublicUser(r.user),
  rating: r.rating,
  comment: r.comment,
  createdAt: r.createdAt,
  commentReplies: (r.commentReplies || []).map((c: any) => ({
    user: toPublicUser(c.user),
    comment: c.comment,
    createdAt: c.createdAt,
  })),
});

export const toPublicQuestion = (q: any) => ({
  _id: q._id,
  user: toPublicUser(q.user),
  question: q.question,
  createdAt: q.createdAt,
  questionReplies: (q.questionReplies || []).map((a: any) => ({
    _id: a._id,
    user: toPublicUser(a.user),
    answer: a.answer,
    createdAt: a.createdAt,
  })),
});

// A course document (or its cached JSON copy) with reviews made safe.
// Idempotent: running it on already-clean data changes nothing.
export const toPublicCourse = (course: any) => {
  const plain = typeof course?.toObject === "function" ? course.toObject() : { ...course };
  plain.reviews = (plain.reviews || []).map(toPublicReview);
  return plain;
};
