import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import ReportModel, { REPORT_REASONS, REPORT_STATUSES } from "../models/report.model";
import DiscussionModel from "../models/discussion.model";
import userModel from "../models/user.model";
import { logActivity } from "../utils/auditLog";
import { isObjectId } from "../services/enrollment.service";
import { notifyUser, notifyUsers } from "../services/notification.service";
import { getCourseAccess } from "./discussion.controller";

const MAX_DETAILS = 500;
const EXCERPT_LENGTH = 300;
const MAX_NOTE = 500;

// ------------------- Report a thread or a reply -------------------
// Anyone who may read the course's discussions can report what's in them.

export const reportDiscussionContent = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { discussionId } = req.params;
      const { replyId, reason } = req.body || {};
      const details = String(req.body?.details || "").trim();

      if (!isObjectId(discussionId)) {
        return next(new ErrorHandler("Invalid discussion id", 400));
      }
      if (replyId !== undefined && !isObjectId(replyId)) {
        return next(new ErrorHandler("Invalid reply id", 400));
      }
      if (!(REPORT_REASONS as readonly string[]).includes(reason)) {
        return next(new ErrorHandler(`Reason must be one of: ${REPORT_REASONS.join(", ")}`, 400));
      }
      if (details.length > MAX_DETAILS) {
        return next(new ErrorHandler(`Details can be at most ${MAX_DETAILS} characters`, 400));
      }

      const discussion = await DiscussionModel.findById(discussionId);
      if (!discussion) {
        return next(new ErrorHandler("Discussion not found", 404));
      }

      // You can only report what you could read yourself.
      const { allowed, course } = await getCourseAccess(req.user, String(discussion.course));
      if (!allowed || !course) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      let text: string, authorId: any, authorName: string;
      if (replyId) {
        const reply = discussion.replies.find((r) => String(r._id) === String(replyId));
        if (!reply) {
          return next(new ErrorHandler("Reply not found", 404));
        }
        text = reply.body;
        authorId = reply.author;
        authorName = reply.authorName;
      } else {
        text = `${discussion.title}\n${discussion.body}`;
        authorId = discussion.author;
        authorName = discussion.authorName;
      }

      const reporterId = String(req.user?._id);
      if (String(authorId) === reporterId) {
        return next(new ErrorHandler("You can't report your own post", 400));
      }

      try {
        await ReportModel.create({
          reporter: reporterId,
          reporterName: req.user?.name,
          targetType: replyId ? "reply" : "discussion",
          course: discussion.course,
          discussion: discussion._id,
          replyId: replyId || undefined,
          targetKey: `${discussion._id}:${replyId || "thread"}`,
          excerpt: text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text,
          contentAuthor: authorId,
          contentAuthorName: authorName,
          reason,
          details: details || undefined,
        });
      } catch (error: any) {
        if (error?.code === 11000) {
          return next(new ErrorHandler("You already reported this post", 409));
        }
        throw error;
      }

      // The admins decide reports; the course's instructor (a moderator of that
      // course) is told as well, so a quick fix doesn't have to wait.
      const admins = (await userModel.find({ role: "admin" }).select("_id")).map((a) => String(a._id));
      const recipients = new Set<string>(admins);
      if (course.instructor) recipients.add(String(course.instructor));
      recipients.delete(reporterId);
      await notifyUsers(
        [...recipients],
        "Content reported",
        `A post in "${course.name}" was reported as ${reason}`,
        "/admin/reports"
      );

      res.status(201).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Admin: the reports -------------------

export const getReports = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = String(req.query.status || "open");
      const filter: Record<string, any> = {};
      if (status !== "all") {
        if (!(REPORT_STATUSES as readonly string[]).includes(status)) {
          return next(new ErrorHandler("Invalid status filter", 400));
        }
        filter.status = status;
      }

      const reports = await ReportModel.find(filter).sort({ createdAt: -1 }).limit(200);

      // Has the reported post been deleted since? Tell the admin, so they don't
      // go looking for it.
      const threads = await DiscussionModel.find({ _id: { $in: reports.map((r) => r.discussion) } }).select(
        "replies._id"
      );
      const byId = new Map(threads.map((t) => [String(t._id), t]));
      const stillThere = (r: any) => {
        const thread = byId.get(String(r.discussion));
        if (!thread) return false;
        return r.replyId ? thread.replies.some((x) => String(x._id) === String(r.replyId)) : true;
      };

      res.status(200).json({
        success: true,
        reports: reports.map((r) => ({
          _id: r._id,
          reporterName: r.reporterName,
          targetType: r.targetType,
          course: r.course,
          discussion: r.discussion,
          excerpt: r.excerpt,
          contentAuthorName: r.contentAuthorName,
          reason: r.reason,
          details: r.details,
          status: r.status,
          resolutionNote: r.resolutionNote,
          resolvedAt: r.resolvedAt,
          createdAt: r.createdAt,
          contentStillExists: stillThere(r),
        })),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const resolveReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};
      const note = String(req.body?.note || "").trim();

      if (!isObjectId(id)) {
        return next(new ErrorHandler("Invalid report id", 400));
      }
      if (status !== "resolved" && status !== "dismissed") {
        return next(new ErrorHandler("Status must be resolved or dismissed", 400));
      }
      if (note.length > MAX_NOTE) {
        return next(new ErrorHandler(`Note can be at most ${MAX_NOTE} characters`, 400));
      }

      // Only an open report can be closed - and two admins closing the same
      // report at once can't both do it.
      const report = await ReportModel.findOneAndUpdate(
        { _id: id, status: "open" },
        {
          status,
          resolutionNote: note || undefined,
          resolvedBy: String(req.user?._id),
          resolvedAt: new Date(),
        },
        { new: true }
      );
      if (!report) {
        return next(new ErrorHandler("Report not found or already closed", 404));
      }

      await notifyUser(
        String(report.reporter),
        "Your report was reviewed",
        status === "resolved"
          ? "Thanks for the report - a moderator took care of it."
          : "A moderator looked at your report and decided no action was needed."
      );

      logActivity(req, `report.${status}`, `Closed a report on ${report.contentAuthorName}'s post as ${status}`, {
        reportId: id,
        reason: report.reason,
      });

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
