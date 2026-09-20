import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
} from "../controllers/announcement.controller";

const announcementRouter = express.Router();

announcementRouter.get("/announcements", getAnnouncements);

announcementRouter.post(
  "/admin/create-announcement",
  isAuthenticated,
  authorizeRoles("admin"),
  createAnnouncement
);

announcementRouter.delete(
  "/admin/announcement/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteAnnouncement
);

export default announcementRouter;