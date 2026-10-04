import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import DiscussionModel, {
  IDiscussion,
  MAX_REPLIES_PER_THREAD,
} from "../models/discussion.model";
import CourseModel from "../models/course.model";
import userModel from "../models/user.model";
import { logActivity } from "../utils/auditLog";
import { hasCourseContentAccess, isObjectId } from "../services/enrollment.service";
import { notifyUser, notifyUsers } from "../services/notification.service";

const MAX_TITLE = 150;
const MAX_BODY = 5000;
const MAX_REPLY = 3000;
const PREVIEW_LENGTH = 200;

const threadLink = (courseId: any, discussionId: any) =>
  `/course-access/${courseId}/discussions/${discussionId}`;

// ---------------------------------------------------------------------------
// Who may do what
// ---------------------------------------------------------------------------
// access:    admin, the course's own instructor, or an enrolled student
//            (the same rule as lessons, assignments and quizzes).
// moderator: admin, or the course's own instructor. Moderators can pin and can
//            delete anyone's thread or reply. Everyone else can only delete
//            their own posts.

export const getCourseAccess = async (user: any, courseId: string) => {
  if (!isObjectId(courseId)) return { allowed: false, isModerator: false, course: null };

  const course = await CourseModel.findById(courseId).select("name instructor");
  if (!course) return { allowed: false, isModerator: false, course: null };

  const allowed = await hasCourseContentAccess(user?.role, String(user?._id), courseId);
  const isModerator =
    user?.role === "admin" ||
    (user?.role === "instructor" &&
      !!course.instructor &&
      String(course.instructor) === String(user._id));

  return { allowed, isModerator, course };
};

// Pure: a thread counts as answered once anyone other than a student replied.
export const isAnsweredByStaff = (replies: { authorRole: string }[]) =>
  replies.some((r) => r.authorRole !== "student");

// A thread without its replies - what the list pages show.
const toListItem = (d: IDiscussion, courseName?: string) => ({
  _id: d._id,
  course: d.course,
  courseName,
  title: d.title,
  preview: d.body.length > PREVIEW_LENGTH ? `${d.body.slice(0, PREVIEW_LENGTH)}…` : d.body,
  authorName: d.authorName,
  authorRole: d.authorRole,
  pinned: d.pinned,
  replyCount: d.replies.length,
  answered: isAnsweredByStaff(d.replies),
  lastActivityAt: d.lastActivityAt,
  createdAt: d.createdAt,
});

// Who should hear about a new thread: the course's instructor, or the admins
// for a course that has none. Never the person who posted it.
const getStaffToNotify = async (course: any, exceptUserId: string): Promise<string[]> => {
  let ids: string[];
  if (course.instructor) {
    ids = [String(course.instructor)];
  } else {
    ids = (await userModel.find({ role: "admin" }).select("_id")).map((a) => String(a._id));
  }
  return ids.filter((id) => id !== exceptUserId);
};

// ------------------- List a course's threads -------------------

export const listDiscussions = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { allowed, isModerator, course } = await getCourseAccess(req.user, req.params.id);
      if (!course || !allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const threads = await DiscussionModel.find({ course: course._id })
        .sort({ pinned: -1, lastActivityAt: -1 })
        .limit(100);

      res.status(200).json({
        success: true,
        canModerate: isModerator,
        discussions: threads.map((t) => toListItem(t)),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Start a thread -------------------

export const createDiscussion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const title = String(req.body.title || "").trim();
      const body = String(req.body.body || "").trim();

      if (!title || !body) {
        return next(new ErrorHandler("Title and message are required", 400));
      }
      if (title.length > MAX_TITLE) {
        return next(new ErrorHandler(`Title can be at most ${MAX_TITLE} characters`, 400));
      }
      if (body.length > MAX_BODY) {
        return next(new ErrorHandler(`Message can be at most ${MAX_BODY} characters`, 400));
      }

      const { allowed, course } = await getCourseAccess(req.user, req.params.id);
      if (!course || !allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const authorId = String(req.user?._id);
      const discussion = await DiscussionModel.create({
        course: course._id,
        author: authorId,
        authorName: req.user?.name,
        authorRole: req.user?.role,
        title,
        body,
      });

      await notifyUsers(
        await getStaffToNotify(course, authorId),
        "New discussion",
        `${req.user?.name} started "${title}" in ${course.name}`,
        threadLink(course._id, discussion._id)
      );

      res.status(201).json({ success: true, discussion: toListItem(discussion, course.name) });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Read one thread (with replies) -------------------

export const getDiscussion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { discussionId } = req.params;
      if (!isObjectId(discussionId)) {
        return next(new ErrorHandler("Invalid discussion id", 400));
      }

      const discussion = await DiscussionModel.findById(discussionId);
      if (!discussion) {
        return next(new ErrorHandler("Discussion not found", 404));
      }

      // The thread's own course decides who may read it - the id in the URL is
      // never trusted to say which course it belongs to.
      const { allowed, isModerator } = await getCourseAccess(req.user, String(discussion.course));
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      res.status(200).json({ success: true, canModerate: isModerator, discussion });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Reply -------------------

export const addDiscussionReply = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { discussionId } = req.params;
      const body = String(req.body.body || "").trim();

      if (!isObjectId(discussionId)) {
        return next(new ErrorHandler("Invalid discussion id", 400));
      }
      if (!body) {
        return next(new ErrorHandler("Reply can't be empty", 400));
      }
      if (body.length > MAX_REPLY) {
        return next(new ErrorHandler(`Reply can be at most ${MAX_REPLY} characters`, 400));
      }

      const existing = await DiscussionModel.findById(discussionId).select("course");
      if (!existing) {
        return next(new ErrorHandler("Discussion not found", 404));
      }

      const { allowed, course } = await getCourseAccess(req.user, String(existing.course));
      if (!course || !allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const now = new Date();
      // The "replies.N doesn't exist" condition enforces the cap atomically:
      // two replies arriving together can't both squeeze past it.
      const updated = await DiscussionModel.findOneAndUpdate(
        { _id: discussionId, [`replies.${MAX_REPLIES_PER_THREAD - 1}`]: { $exists: false } },
        {
          $push: {
            replies: {
              author: req.user?._id,
              authorName: req.user?.name,
              authorRole: req.user?.role,
              body,
              createdAt: now,
            },
          },
          $set: { lastActivityAt: now },
        },
        { new: true }
      );
      if (!updated) {
        return next(new ErrorHandler("This discussion has reached its reply limit", 400));
      }

      // tell the person who started the thread (unless they are replying to themselves)
      if (String(updated.author) !== String(req.user?._id)) {
        await notifyUser(
          String(updated.author),
          "New reply to your discussion",
          `${req.user?.name} replied to "${updated.title}"`,
          threadLink(updated.course, updated._id)
        );
      }

      res.status(201).json({ success: true, discussion: updated });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Pin / unpin (moderators only) -------------------

export const setDiscussionPinned = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { discussionId } = req.params;
      if (!isObjectId(discussionId)) {
        return next(new ErrorHandler("Invalid discussion id", 400));
      }
      if (typeof req.body.pinned !== "boolean") {
        return next(new ErrorHandler("pinned must be true or false", 400));
      }

      const discussion = await DiscussionModel.findById(discussionId);
      if (!discussion) {
        return next(new ErrorHandler("Discussion not found", 404));
      }

      const { isModerator } = await getCourseAccess(req.user, String(discussion.course));
      if (!isModerator) {
        return next(new ErrorHandler("Only the course instructor or an admin can pin", 403));
      }

      discussion.pinned = req.body.pinned;
      await discussion.save();

      res.status(200).json({ success: true, pinned: discussion.pinned });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Delete a thread (its author, or a moderator) -------------------

export const deleteDiscussion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { discussionId } = req.params;
      if (!isObjectId(discussionId)) {
        return next(new ErrorHandler("Invalid discussion id", 400));
      }

      const discussion = await DiscussionModel.findById(discussionId);
      if (!discussion) {
        return next(new ErrorHandler("Discussion not found", 404));
      }

      const { allowed, isModerator } = await getCourseAccess(req.user, String(discussion.course));
      const isAuthor = String(discussion.author) === String(req.user?._id);
      if (!allowed || (!isAuthor && !isModerator)) {
        return next(new ErrorHandler("You can't delete this discussion", 403));
      }

      await discussion.deleteOne();

      if (!isAuthor) {
        // a moderator removed someone else's post: tell them, and keep a record
        await notifyUser(
          String(discussion.author),
          "Your discussion was removed",
          `"${discussion.title}" was removed by a moderator`
        );
        logActivity(req, "discussion.delete", `Removed discussion "${discussion.title}"`, {
          discussionId,
          courseId: discussion.course,
        });
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Delete a reply (its author, or a moderator) -------------------

export const deleteDiscussionReply = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { discussionId, replyId } = req.params;
      if (!isObjectId(discussionId) || !isObjectId(replyId)) {
        return next(new ErrorHandler("Invalid id", 400));
      }

      const discussion = await DiscussionModel.findById(discussionId);
      if (!discussion) {
        return next(new ErrorHandler("Discussion not found", 404));
      }

      const reply = discussion.replies.find((r) => String(r._id) === replyId);
      if (!reply) {
        return next(new ErrorHandler("Reply not found", 404));
      }

      const { allowed, isModerator } = await getCourseAccess(req.user, String(discussion.course));
      const isAuthor = String(reply.author) === String(req.user?._id);
      if (!allowed || (!isAuthor && !isModerator)) {
        return next(new ErrorHandler("You can't delete this reply", 403));
      }

      await DiscussionModel.updateOne({ _id: discussionId }, { $pull: { replies: { _id: replyId } } });

      if (!isAuthor) {
        await notifyUser(
          String(reply.author),
          "Your reply was removed",
          `Your reply in "${discussion.title}" was removed by a moderator`
        );
        logActivity(req, "discussion.reply_delete", `Removed a reply in "${discussion.title}"`, {
          discussionId,
          replyId,
          courseId: discussion.course,
        });
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor inbox: threads across MY courses -------------------
// Unanswered threads first (that's what an instructor needs to act on), then
// the most recently active.

export const getInstructorDiscussions = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await CourseModel.find({ instructor: req.user?._id }).select("name");
      const nameById = new Map(courses.map((c) => [String(c._id), c.name]));

      const threads = await DiscussionModel.find({ course: { $in: courses.map((c) => c._id) } })
        .sort({ lastActivityAt: -1 })
        .limit(200);

      const items = threads.map((t) => toListItem(t, nameById.get(String(t.course))));
      // stable sort: unanswered before answered, recency order kept within each
      items.sort((a, b) => Number(a.answered) - Number(b.answered));

      res.status(200).json({ success: true, discussions: items });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
