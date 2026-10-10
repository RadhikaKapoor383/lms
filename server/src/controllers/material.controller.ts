import { Request, Response, NextFunction } from "express";
import { Readable } from "stream";
import multer from "multer";
import cloudinary from "cloudinary";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseMaterialModel from "../models/courseMaterial.model";
import LessonModel from "../models/lesson.model";
import { logActivity } from "../utils/auditLog";
import { isObjectId, hasCourseContentAccess } from "../services/enrollment.service";
import { hitRateLimit } from "../utils/rateLimit";
import {
  MAX_MATERIALS_PER_COURSE,
  MAX_MATERIAL_BYTES,
  MAX_TITLE_LENGTH,
  attachmentHeader,
  buildPublicId,
  checkMaterialFile,
  safeDisplayName,
} from "../services/materialFile.service";

// Files are kept private ("authenticated" delivery): there is no public link to
// them. The only way to get one is the download route below, which checks that
// the person may see this course first.
const STORAGE = { resource_type: "raw", type: "authenticated" } as const;

// ------------------- Receiving the upload -------------------
// The file is held in memory (max 10 MB) just long enough to check it and pass
// it on. This runs AFTER the permission checks in the route, so someone who
// isn't allowed to upload never gets the server to read a big body.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MATERIAL_BYTES, files: 1, fields: 5, fieldSize: 2000 },
});

export const receiveMaterialFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (error: any) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(
        new ErrorHandler(`The file is too large (maximum ${MAX_MATERIAL_BYTES / 1024 / 1024} MB)`, 400)
      );
    }
    return next(new ErrorHandler("The upload could not be read. Send one file in the 'file' field.", 400));
  });
};

const putInStorage = (buffer: Buffer, publicId: string) =>
  new Promise<void>((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { ...STORAGE, public_id: publicId, overwrite: false },
      (error) => (error ? reject(error) : resolve())
    );
    stream.end(buffer);
  });

const removeFromStorage = async (publicId: string) => {
  try {
    await cloudinary.v2.uploader.destroy(publicId, { ...STORAGE, invalidate: true });
  } catch (error: any) {
    // A leftover file in storage is untidy but harmless (it has no public link).
    console.error("Could not delete a stored material:", error.message);
  }
};

// What the browser may know about a material - never the storage id.
const toPublicMaterial = (m: any) => ({
  _id: m._id,
  title: m.title,
  fileName: m.fileName,
  ext: m.ext,
  size: m.size,
  lesson: m.lesson,
  createdAt: m.createdAt,
});

// ------------------- Instructor / admin: upload -------------------

export const uploadMaterial = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      if (!isObjectId(courseId)) {
        return next(new ErrorHandler("Invalid course id", 400));
      }
      const file = req.file;
      if (!file) {
        return next(new ErrorHandler("Choose a file to upload", 400));
      }

      const limit = await hitRateLimit(`material-upload:${String(req.user?._id)}`, 30, 60 * 60);
      if (!limit.allowed) {
        return next(new ErrorHandler("You're uploading too quickly. Try again in a few minutes.", 429));
      }

      const check = checkMaterialFile(file.buffer, file.originalname);
      if (!check.ok) {
        return next(new ErrorHandler(check.error, 400));
      }

      if ((await CourseMaterialModel.countDocuments({ course: courseId })) >= MAX_MATERIALS_PER_COURSE) {
        return next(
          new ErrorHandler(`A course can have at most ${MAX_MATERIALS_PER_COURSE} materials`, 400)
        );
      }

      const fileName = safeDisplayName(file.originalname);
      const rawTitle = typeof req.body?.title === "string" ? req.body.title : "";
      const title = safeDisplayName(rawTitle, fileName).slice(0, MAX_TITLE_LENGTH);

      // Optional: attach to one lesson of THIS course.
      let lesson: string | undefined;
      const lessonId = req.body?.lessonId;
      if (lessonId) {
        if (!isObjectId(lessonId) || !(await LessonModel.exists({ _id: lessonId, course: courseId }))) {
          return next(new ErrorHandler("That lesson does not belong to this course", 400));
        }
        lesson = String(lessonId);
      }

      const publicId = buildPublicId(courseId, check.ext);
      await putInStorage(file.buffer, publicId);

      let material;
      try {
        material = await CourseMaterialModel.create({
          course: courseId,
          lesson,
          title,
          fileName,
          ext: check.ext,
          mimeType: check.mimeType,
          size: file.size,
          publicId,
          uploadedBy: req.user?._id,
        });
      } catch (error) {
        await removeFromStorage(publicId); // don't leave a file nobody can reach
        throw error;
      }

      logActivity(req, "material.upload", `Uploaded "${title}" to a course`, {
        courseId,
        materialId: String(material._id),
      });

      res.status(201).json({ success: true, material: toPublicMaterial(material) });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Anyone with access to the course: list -------------------

export const getCourseMaterials = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      if (!isObjectId(courseId)) {
        return next(new ErrorHandler("Invalid course id", 400));
      }
      const allowed = await hasCourseContentAccess(req.user?.role, String(req.user?._id), courseId);
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const materials = await CourseMaterialModel.find({ course: courseId }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, materials: materials.map(toPublicMaterial) });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Anyone with access to the course: download -------------------
// The server fetches the private file with a signed link and passes it on, so
// the storage address never reaches the browser and can't be shared around.

export const downloadMaterial = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: courseId, materialId } = req.params;
      if (!isObjectId(courseId) || !isObjectId(materialId)) {
        return next(new ErrorHandler("Invalid id", 400));
      }
      const allowed = await hasCourseContentAccess(req.user?.role, String(req.user?._id), courseId);
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      // Matching the course too means a material id from another course is a 404.
      const material = await CourseMaterialModel.findOne({ _id: materialId, course: courseId });
      if (!material) {
        return next(new ErrorHandler("Material not found", 404));
      }

      const signedUrl = cloudinary.v2.url(material.publicId, {
        ...STORAGE,
        sign_url: true,
        secure: true,
      });
      const upstream = await fetch(signedUrl);
      if (!upstream.ok || !upstream.body) {
        return next(new ErrorHandler("The file is not available right now", 502));
      }

      res.status(200);
      res.setHeader("Content-Type", material.mimeType);
      res.setHeader("Content-Disposition", attachmentHeader(`${material.title}.${material.ext}`));
      res.setHeader("Content-Length", String(material.size));
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");

      const body = Readable.fromWeb(upstream.body as any);
      body.on("error", () => res.destroy());
      body.pipe(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor / admin: delete -------------------

export const deleteMaterial = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: courseId, materialId } = req.params;
      if (!isObjectId(courseId) || !isObjectId(materialId)) {
        return next(new ErrorHandler("Invalid id", 400));
      }

      // The course in the filter keeps an instructor of course A from deleting
      // a material of course B by sending B's material id under A's course id.
      const material = await CourseMaterialModel.findOneAndDelete({ _id: materialId, course: courseId });
      if (!material) {
        return next(new ErrorHandler("Material not found", 404));
      }
      await removeFromStorage(material.publicId);

      logActivity(req, "material.delete", `Deleted material "${material.title}"`, {
        courseId,
        materialId,
      });

      res.status(200).json({ success: true, message: "Material deleted" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Used when a whole course is deleted.
export const removeCourseMaterials = async (courseId: string) => {
  const materials = await CourseMaterialModel.find({ course: courseId }).select("publicId");
  await Promise.all(materials.map((m) => removeFromStorage(m.publicId)));
  await CourseMaterialModel.deleteMany({ course: courseId });
};
