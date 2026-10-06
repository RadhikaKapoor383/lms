import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getReports,
  reportDiscussionContent,
  resolveReport,
} from "../controllers/report.controller";

const reportRouter = express.Router();

// any logged-in role; the controller checks they can read that course
reportRouter.post("/discussions/:discussionId/report", isAuthenticated, reportDiscussionContent);

reportRouter.get("/admin/reports", isAuthenticated, authorizeRoles("admin"), getReports);
reportRouter.put("/admin/reports/:id", isAuthenticated, authorizeRoles("admin"), resolveReport);

export default reportRouter;
