import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  addDiscussionReply,
  createDiscussion,
  deleteDiscussion,
  deleteDiscussionReply,
  getDiscussion,
  getInstructorDiscussions,
  listDiscussions,
  setDiscussionPinned,
} from "../controllers/discussion.controller";

const discussionRouter = express.Router();

// Every route here is open to any logged-in role: the controller itself checks
// that the caller may enter THAT course (admin, its instructor, or an enrolled
// student) and whether they can moderate it.

discussionRouter.get("/courses/:id/discussions", isAuthenticated, listDiscussions);
discussionRouter.post("/courses/:id/discussions", isAuthenticated, createDiscussion);

discussionRouter.get("/discussions/:discussionId", isAuthenticated, getDiscussion);
discussionRouter.delete("/discussions/:discussionId", isAuthenticated, deleteDiscussion);
discussionRouter.put("/discussions/:discussionId/pin", isAuthenticated, setDiscussionPinned);

discussionRouter.post("/discussions/:discussionId/replies", isAuthenticated, addDiscussionReply);
discussionRouter.delete(
  "/discussions/:discussionId/replies/:replyId",
  isAuthenticated,
  deleteDiscussionReply
);

// instructor inbox
discussionRouter.get(
  "/instructor/discussions",
  isAuthenticated,
  authorizeRoles("instructor"),
  getInstructorDiscussions
);

export default discussionRouter;
