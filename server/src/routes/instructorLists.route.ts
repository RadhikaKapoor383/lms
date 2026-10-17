import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getInstructorAssignments,
  getInstructorQuizzes,
  getInstructorStudents,
} from "../controllers/instructorLists.controller";

const instructorListsRouter = express.Router();
const instructorOnly = [isAuthenticated, authorizeRoles("instructor")];

instructorListsRouter.get("/instructor/students", ...instructorOnly, getInstructorStudents);
instructorListsRouter.get("/instructor/assignments", ...instructorOnly, getInstructorAssignments);
instructorListsRouter.get("/instructor/quizzes", ...instructorOnly, getInstructorQuizzes);

export default instructorListsRouter;
