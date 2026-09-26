import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../controllers/category.controller";

const categoryRouter = express.Router();

// Any signed-in user can read the list (instructors/admin need it in the
// course form dropdown; students will need it for the catalog filter later).
categoryRouter.get("/categories", isAuthenticated, getCategories);

categoryRouter.post(
  "/admin/categories",
  isAuthenticated,
  authorizeRoles("admin"),
  createCategory
);
categoryRouter.put(
  "/admin/categories/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  updateCategory
);
categoryRouter.delete(
  "/admin/categories/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteCategory
);

export default categoryRouter;
