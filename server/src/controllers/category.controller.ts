import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CategoryModel from "../models/category.model";
import CourseModel from "../models/course.model";
import { logActivity } from "../utils/auditLog";

// ------------------- List (anyone signed in - used by the course form's dropdown) -------------------

export const getCategories = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await CategoryModel.find().sort({ name: 1 });
      res.status(200).json({ success: true, categories });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Create (admin) -------------------

export const createCategory = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const name = String(req.body?.name || "").trim();
      if (!name) {
        return next(new ErrorHandler("Category name is required", 400));
      }

      const exists = await CategoryModel.findOne({
        name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      });
      if (exists) {
        return next(new ErrorHandler("That category already exists", 409));
      }

      const category = await CategoryModel.create({ name });
      logActivity(req, "category.create", `Created category "${name}"`, {
        categoryId: category._id,
      });

      res.status(201).json({ success: true, category });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Rename (admin) -------------------

export const updateCategory = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const name = String(req.body?.name || "").trim();

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandler("Invalid category id", 400));
      }
      if (!name) {
        return next(new ErrorHandler("Category name is required", 400));
      }

      const category = await CategoryModel.findByIdAndUpdate(
        id,
        { name },
        { new: true, runValidators: true }
      );
      if (!category) {
        return next(new ErrorHandler("Category not found", 404));
      }

      logActivity(req, "category.rename", `Renamed a category to "${name}"`, {
        categoryId: id,
      });

      res.status(200).json({ success: true, category });
    } catch (error: any) {
      if (error?.code === 11000) {
        return next(new ErrorHandler("That category already exists", 409));
      }
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Delete (admin) -------------------
// Blocked while any course still uses it - otherwise those courses would be
// left pointing at a category that no longer exists.

export const deleteCategory = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandler("Invalid category id", 400));
      }

      const inUse = await CourseModel.countDocuments({ category: id });
      if (inUse > 0) {
        return next(
          new ErrorHandler(
            `${inUse} course(s) still use this category. Reassign them first.`,
            409
          )
        );
      }

      const category = await CategoryModel.findByIdAndDelete(id);
      if (!category) {
        return next(new ErrorHandler("Category not found", 404));
      }

      logActivity(req, "category.delete", `Deleted category "${category.name}"`, {
        categoryId: id,
      });

      res.status(200).json({ success: true, message: "Category deleted" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
