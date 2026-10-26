import express from "express";
import { authorizeCourseOwner, authorizeRoles, isAuthenticated, requirePermission } from "../middleware/auth";
import {
  deleteMaterial,
  downloadMaterial,
  getCourseMaterials,
  receiveMaterialFile,
  setMaterialLesson,
  uploadMaterial,
} from "../controllers/material.controller";

const materialRouter = express.Router();

// :id = courseId. Permission checks come BEFORE the upload is read, so someone
// who may not upload can't make the server receive a 10 MB body.
materialRouter.post(
  "/courses/:id/materials",
  isAuthenticated,
  requirePermission("material.manage"),
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  receiveMaterialFile,
  uploadMaterial
);

// Admin, the owning instructor and enrolled students (checked in the controller).
materialRouter.get("/courses/:id/materials", isAuthenticated, getCourseMaterials);
materialRouter.get("/courses/:id/materials/:materialId/download", isAuthenticated, downloadMaterial);

materialRouter.put(
  "/courses/:id/materials/:materialId/lesson",
  isAuthenticated,
  requirePermission("material.manage"),
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  setMaterialLesson
);

materialRouter.delete(
  "/courses/:id/materials/:materialId",
  isAuthenticated,
  requirePermission("material.manage"),
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  deleteMaterial
);

export default materialRouter;
