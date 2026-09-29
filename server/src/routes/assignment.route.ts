import express from "express";
import {
  authorizeAssignmentOwner,
  authorizeCourseOwner,
  authorizeRoles,
  isAuthenticated,
} from "../middleware/auth";
import {
  createAssignment,
  deleteAssignment,
  editAssignment,
  getAssignmentSubmissions,
  getCourseAssignments,
  getMyAssignments,
  gradeSubmission,
  submitAssignment,
} from "../controllers/assignment.controller";

const assignmentRouter = express.Router();

// :id = courseId here, guarded the same way course editing is.
assignmentRouter.post(
  "/courses/:id/assignments",
  isAuthenticated,
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  createAssignment
);

// Admin/owning-instructor see counts; an enrolled student sees their own
// submission per assignment. hasCourseContentAccess (inside the controller)
// covers all three, so no ownership middleware on this one.
assignmentRouter.get("/courses/:id/assignments", isAuthenticated, getCourseAssignments);

// From here, :id = assignmentId.
assignmentRouter.put(
  "/assignments/:id",
  isAuthenticated,
  authorizeRoles("admin", "instructor"),
  authorizeAssignmentOwner,
  editAssignment
);

assignmentRouter.delete(
  "/assignments/:id",
  isAuthenticated,
  authorizeRoles("admin", "instructor"),
  authorizeAssignmentOwner,
  deleteAssignment
);

assignmentRouter.get(
  "/assignments/:id/submissions",
  isAuthenticated,
  authorizeRoles("admin", "instructor"),
  authorizeAssignmentOwner,
  getAssignmentSubmissions
);

assignmentRouter.put(
  "/assignments/:id/submissions/:studentId/grade",
  isAuthenticated,
  authorizeRoles("admin", "instructor"),
  authorizeAssignmentOwner,
  gradeSubmission
);

assignmentRouter.post(
  "/assignments/:id/submit",
  isAuthenticated,
  authorizeRoles("student"),
  submitAssignment
);

assignmentRouter.get(
  "/my-assignments",
  isAuthenticated,
  authorizeRoles("student"),
  getMyAssignments
);

export default assignmentRouter;
