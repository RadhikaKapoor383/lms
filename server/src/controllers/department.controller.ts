import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import DepartmentModel from "../models/department.model";
import CourseModel from "../models/course.model";
import userModel from "../models/user.model";
import { redis } from "../utils/redis";
import { logActivity } from "../utils/auditLog";
import { cleanDepartmentName, exactNamePattern } from "../services/department.service";

// ------------------- List (anyone signed in - course form, instructors page) -------------------
// Each department comes with how many courses and instructors use it, so the
// admin page can say why a delete would be refused before anyone tries.

export const getDepartments = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [departments, courseCounts, instructorCounts] = await Promise.all([
        DepartmentModel.find().sort({ name: 1 }).lean(),
        CourseModel.aggregate([
          { $match: { department: { $ne: null } } },
          { $group: { _id: "$department", n: { $sum: 1 } } },
        ]),
        userModel.aggregate([
          { $match: { role: "instructor", department: { $ne: null } } },
          { $group: { _id: "$department", n: { $sum: 1 } } },
        ]),
      ]);
      const courses = new Map(courseCounts.map((r: any) => [String(r._id), r.n as number]));
      const instructors = new Map(instructorCounts.map((r: any) => [String(r._id), r.n as number]));

      res.status(200).json({
        success: true,
        departments: departments.map((d: any) => ({
          _id: d._id,
          name: d.name,
          courseCount: courses.get(String(d._id)) || 0,
          instructorCount: instructors.get(String(d._id)) || 0,
        })),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Create (admin) -------------------

export const createDepartment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cleaned = cleanDepartmentName(req.body?.name);
      if ("error" in cleaned) return next(new ErrorHandler(cleaned.error, 400));
      const { name } = cleaned;

      if (await DepartmentModel.exists({ name: exactNamePattern(name) })) {
        return next(new ErrorHandler("That department already exists", 409));
      }

      const department = await DepartmentModel.create({ name });
      logActivity(req, "department.create", `Created department "${name}"`, {
        departmentId: department._id,
      });

      res.status(201).json({ success: true, department });
    } catch (error: any) {
      if (error?.code === 11000) {
        return next(new ErrorHandler("That department already exists", 409));
      }
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Rename (admin) -------------------
// Course pages are cached in Redis with the department name inside them, so
// the cached copies of this department's courses (and the course list) are
// dropped - otherwise the old name would show for up to a week.

export const updateDepartment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandler("Invalid department id", 400));
      }
      const cleaned = cleanDepartmentName(req.body?.name);
      if ("error" in cleaned) return next(new ErrorHandler(cleaned.error, 400));
      const { name } = cleaned;

      const clash = await DepartmentModel.exists({ _id: { $ne: id }, name: exactNamePattern(name) });
      if (clash) {
        return next(new ErrorHandler("That department already exists", 409));
      }

      const before = await DepartmentModel.findById(id).lean();
      if (!before) {
        return next(new ErrorHandler("Department not found", 404));
      }
      const department = await DepartmentModel.findByIdAndUpdate(
        id,
        { name },
        { new: true, runValidators: true }
      );

      const courseIds = (await CourseModel.find({ department: id }).select("_id").lean()).map((c: any) =>
        String(c._id)
      );
      await redis.del("allCourses", ...courseIds);

      logActivity(req, "department.rename", `Renamed department "${before.name}" to "${name}"`, {
        departmentId: id,
      });

      res.status(200).json({ success: true, department });
    } catch (error: any) {
      if (error?.code === 11000) {
        return next(new ErrorHandler("That department already exists", 409));
      }
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Delete (admin) -------------------
// Blocked while any course or instructor still belongs to it, so nothing is
// left pointing at a department that no longer exists.

export const deleteDepartment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandler("Invalid department id", 400));
      }

      const [courses, instructors] = await Promise.all([
        CourseModel.countDocuments({ department: id }),
        userModel.countDocuments({ department: id }),
      ]);
      if (courses > 0 || instructors > 0) {
        const parts = [
          courses ? `${courses} course${courses === 1 ? "" : "s"}` : "",
          instructors ? `${instructors} instructor${instructors === 1 ? "" : "s"}` : "",
        ].filter(Boolean);
        return next(
          new ErrorHandler(`${parts.join(" and ")} still belong to this department. Move them first.`, 409)
        );
      }

      const department = await DepartmentModel.findByIdAndDelete(id);
      if (!department) {
        return next(new ErrorHandler("Department not found", 404));
      }

      logActivity(req, "department.delete", `Deleted department "${department.name}"`, {
        departmentId: id,
      });

      res.status(200).json({ success: true, message: "Department deleted" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Put an instructor in a department (admin) -------------------
// Body: { departmentId } - an id, or null/"" to take them out of their department.
// Only the instructor changes; their existing courses keep their own department.

export const setInstructorDepartment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const raw = req.body?.departmentId;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandler("Invalid instructor id", 400));
      }

      let departmentId: string | null = null;
      let departmentName = "";
      if (raw !== null && raw !== undefined && raw !== "") {
        if (typeof raw !== "string" || !mongoose.Types.ObjectId.isValid(raw)) {
          return next(new ErrorHandler("Invalid department id", 400));
        }
        const department = await DepartmentModel.findById(raw).select("name").lean();
        if (!department) return next(new ErrorHandler("Department not found", 404));
        departmentId = raw;
        departmentName = department.name;
      }

      const instructor = await userModel.findOneAndUpdate(
        { _id: id, role: "instructor" },
        departmentId ? { $set: { department: departmentId } } : { $unset: { department: 1 } },
        { new: true }
      );
      if (!instructor) {
        return next(new ErrorHandler("Instructor not found", 404));
      }

      logActivity(
        req,
        "instructor.department",
        departmentId
          ? `Put ${instructor.name} in department "${departmentName}"`
          : `Removed ${instructor.name} from their department`,
        { instructorId: id, departmentId }
      );

      res.status(200).json({
        success: true,
        instructor: {
          _id: instructor._id,
          name: instructor.name,
          department: departmentId ? { _id: departmentId, name: departmentName } : null,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
