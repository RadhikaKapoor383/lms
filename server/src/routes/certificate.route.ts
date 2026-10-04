import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getAdminCertificates,
  getCertificateStatus,
  getInstructorCertificates,
  getMyCertificates,
  reinstateCertificate,
  revokeCertificate,
  verifyCertificate,
} from "../controllers/certificate.controller";

const certificateRouter = express.Router();

// public - anyone holding a certificate id can check it
certificateRouter.get("/certificates/verify/:certificateId", verifyCertificate);

// student
certificateRouter.get(
  "/my-certificates",
  isAuthenticated,
  authorizeRoles("student"),
  getMyCertificates
);
certificateRouter.get(
  "/courses/:id/certificate-status",
  isAuthenticated,
  authorizeRoles("student"),
  getCertificateStatus
);

// instructor (only certificates from their own courses - filtered by instructor id)
certificateRouter.get(
  "/instructor/certificates",
  isAuthenticated,
  authorizeRoles("instructor"),
  getInstructorCertificates
);

// admin
certificateRouter.get(
  "/admin/certificates",
  isAuthenticated,
  authorizeRoles("admin"),
  getAdminCertificates
);
certificateRouter.put(
  "/admin/certificates/:certificateId/revoke",
  isAuthenticated,
  authorizeRoles("admin"),
  revokeCertificate
);
certificateRouter.put(
  "/admin/certificates/:certificateId/reinstate",
  isAuthenticated,
  authorizeRoles("admin"),
  reinstateCertificate
);

export default certificateRouter;
