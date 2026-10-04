import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CertificateModel, { ICertificate } from "../models/certificate.model";
import NotificationModel from "../models/notification.model";
import { logActivity } from "../utils/auditLog";
import { isObjectId } from "../services/enrollment.service";
import {
  evaluateCertificate,
  getEligibilityForStudent,
} from "../services/certificate.service";

// The shape the certificate page needs - and nothing more. No emails, no
// internal ids: this same shape is what the public verify page returns.
const toPublicCertificate = (c: ICertificate) => ({
  certificateId: c.certificateId,
  studentName: c.studentName,
  courseName: c.courseName,
  instructorName: c.instructorName,
  platformName: c.platformName,
  completionDate: c.completionDate,
  issuedAt: c.issuedAt,
  status: c.status,
  revokedAt: c.status === "revoked" ? c.revokedAt : undefined,
});

// ------------------- Public: verify a certificate by its id -------------------
// No login on purpose: an employer holding a printed certificate must be able
// to check it. Safe because ids are unguessable and the response is minimal.

export const verifyCertificate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificateId = String(req.params.certificateId || "").trim().toUpperCase();
      const certificate = await CertificateModel.findOne({ certificateId });

      if (!certificate) {
        return next(new ErrorHandler("Certificate not found", 404));
      }

      res.status(200).json({
        success: true,
        certificate: toPublicCertificate(certificate),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: my certificates -------------------

export const getMyCertificates = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificates = await CertificateModel.find({ student: req.user?._id }).sort({
        issuedAt: -1,
      });
      res.status(200).json({
        success: true,
        certificates: certificates.map(toPublicCertificate),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: certificate progress for one course -------------------
// Also the "catch-up" path: if a student already qualifies (for example they
// finished the course before certificates existed, or an instructor deleted
// the one quiz they hadn't passed), visiting this endpoint issues it.

export const getCertificateStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      if (!isObjectId(courseId)) {
        return next(new ErrorHandler("Invalid course id", 400));
      }

      const studentId = String(req.user?._id);
      const eligibility = await getEligibilityForStudent(studentId, courseId);
      if (!eligibility) {
        return next(new ErrorHandler("You are not enrolled in this course", 403));
      }

      const certificate = await evaluateCertificate(studentId, courseId);

      res.status(200).json({
        success: true,
        status: {
          eligible: eligibility.eligible,
          lessonsComplete: eligibility.lessonsComplete,
          completionPercentage: eligibility.completionPercentage,
          pendingQuizzes: eligibility.pendingQuizzes,
          certificate: certificate
            ? { certificateId: certificate.certificateId, status: certificate.status }
            : null,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor: certificates earned in MY courses -------------------

export const getInstructorCertificates = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificates = await CertificateModel.find({ instructor: req.user?._id }).sort({
        issuedAt: -1,
      });
      res.status(200).json({
        success: true,
        certificates: certificates.map(toPublicCertificate),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Admin: every certificate (+ search) -------------------

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getAdminCertificates = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const search = String(req.query.search || "").trim();
      const filter: Record<string, any> = {};

      if (search) {
        // escaped, so a search like "a.*" is plain text and not a regex bomb
        const pattern = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ certificateId: pattern }, { studentName: pattern }, { courseName: pattern }];
      }

      const certificates = await CertificateModel.find(filter)
        .sort({ issuedAt: -1 })
        .limit(200);

      res.status(200).json({
        success: true,
        certificates: certificates.map((c) => ({
          ...toPublicCertificate(c),
          revokedReason: c.revokedReason,
        })),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Admin: revoke / reinstate -------------------
// Revoking keeps the record (the verify page then says "revoked") instead of
// deleting it - so a printed copy can't pass as valid, and there is a history.

export const revokeCertificate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificateId = String(req.params.certificateId).toUpperCase();
      const reason = String(req.body?.reason || "").trim();

      const certificate = await CertificateModel.findOne({ certificateId });
      if (!certificate) {
        return next(new ErrorHandler("Certificate not found", 404));
      }
      if (certificate.status === "revoked") {
        return next(new ErrorHandler("Certificate is already revoked", 400));
      }

      certificate.status = "revoked";
      certificate.revokedAt = new Date();
      certificate.revokedReason = reason || undefined;
      await certificate.save();

      await NotificationModel.create({
        userId: String(certificate.student),
        title: "Certificate revoked",
        message: `Your certificate for ${certificate.courseName} was revoked${
          reason ? `: ${reason}` : ""
        }`,
        link: "/my-certificates",
      });

      logActivity(
        req,
        "certificate.revoke",
        `Revoked ${certificate.certificateId} (${certificate.studentName}, ${certificate.courseName})`,
        { certificateId: certificate.certificateId, reason }
      );

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const reinstateCertificate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificateId = String(req.params.certificateId).toUpperCase();

      const certificate = await CertificateModel.findOne({ certificateId });
      if (!certificate) {
        return next(new ErrorHandler("Certificate not found", 404));
      }
      if (certificate.status === "valid") {
        return next(new ErrorHandler("Certificate is already valid", 400));
      }

      certificate.status = "valid";
      certificate.revokedAt = undefined;
      certificate.revokedReason = undefined;
      await certificate.save();

      logActivity(
        req,
        "certificate.reinstate",
        `Reinstated ${certificate.certificateId} (${certificate.studentName}, ${certificate.courseName})`,
        { certificateId: certificate.certificateId }
      );

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
