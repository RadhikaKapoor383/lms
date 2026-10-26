import cloudinary from "cloudinary";
import LessonModel from "../models/lesson.model";

// Cloudinary side of uploaded lesson videos.
export const VIDEO_STORAGE = { resource_type: "video", type: "authenticated" } as const;

export const removeVideoFromStorage = async (publicId: string) => {
  try {
    await cloudinary.v2.uploader.destroy(publicId, { ...VIDEO_STORAGE, invalidate: true });
  } catch (error: any) {
    // a leftover private file is untidy but harmless (it has no public link)
    console.error("Could not delete a stored video:", error.message);
  }
};

// Deletes the uploaded videos of the lessons matching `filter` from storage
// (used before those lessons, or their whole course, are deleted).
export const removeLessonVideos = async (filter: Record<string, any>) => {
  const lessons = await LessonModel.find({ ...filter, video: { $exists: true } }).select("video").lean();
  await Promise.all(lessons.map((l: any) => (l.video?.publicId ? removeVideoFromStorage(l.video.publicId) : null)));
};
