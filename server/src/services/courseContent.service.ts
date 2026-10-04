import { toPublicQuestion } from "../utils/publicProfile";
import ModuleModel from "../models/module.model";
import LessonModel from "../models/lesson.model";
import LessonProgressModel from "../models/lessonProgress.model";

// ------------------- Modules & lessons sync -------------------
//
// The client still sends/receives a flat `courseData` array (each item
// carrying a `videoSection` label) exactly like before Module/Lesson existed -
// that contract didn't need to change. What changed is what happens with it
// on the server: lessons that share a `videoSection` become one Module, and
// each lesson becomes its own Lesson document instead of an embedded
// sub-document.
//
// A lesson's `_id` is preserved across edits whenever the client sends one
// back (CourseForm does, since it starts from what getCourseForEdit returned).
// That matters because LessonProgress rows point at a lesson by id - losing
// that id on every edit would silently erase students' completion history.
// A lesson removed from the submission is deleted along with any progress
// recorded against it.
export const syncModulesAndLessons = async (courseId: any, courseData: any) => {
  const incoming = Array.isArray(courseData) ? courseData : [];

  const existingLessons = await LessonModel.find({ course: courseId }).select("_id");
  const existingLessonIds = new Set(existingLessons.map((l) => String(l._id)));

  // Group by section name, in order of first appearance - not by contiguous
  // runs, so re-ordering lessons under an existing section still works.
  const groups = new Map<string, any[]>();
  for (const item of incoming) {
    const sectionName = String(item?.videoSection || "").trim() || "General";
    if (!groups.has(sectionName)) groups.set(sectionName, []);
    groups.get(sectionName)!.push(item);
  }

  // Modules themselves have no progress pointing at them, so it's simplest to
  // always rebuild them fresh rather than reconcile by id.
  await ModuleModel.deleteMany({ course: courseId });

  const keptLessonIds = new Set<string>();
  let moduleOrder = 0;

  for (const [title, items] of groups) {
    const module = await ModuleModel.create({ course: courseId, title, order: moduleOrder++ });

    let lessonOrder = 0;
    for (const item of items) {
      const lessonFields = {
        module: module._id,
        course: courseId,
        title: item.title,
        description: item.description,
        videoUrl: item.videoUrl,
        videoThumbnail: item.videoThumbnail,
        videoLength: item.videoLength,
        videoPlayer: item.videoPlayer,
        links: item.links || [],
        suggestion: item.suggestion,
        order: lessonOrder++,
      };

      if (item?._id && existingLessonIds.has(String(item._id))) {
        await LessonModel.findByIdAndUpdate(item._id, lessonFields);
        keptLessonIds.add(String(item._id));
      } else {
        const created = await LessonModel.create(lessonFields);
        keptLessonIds.add(String(created._id));
      }
    }
  }

  const removedIds = [...existingLessonIds].filter((id) => !keptLessonIds.has(id));
  if (removedIds.length) {
    await LessonModel.deleteMany({ _id: { $in: removedIds } });
    await LessonProgressModel.deleteMany({ lessonId: { $in: removedIds } });
  }
};

// ------------------- Flatten modules+lessons back to the courseData shape -------------------
// safeFields=true strips video/answer content, for the public curriculum-free
// listing endpoints; false returns everything, for the gated content viewer
// and for the edit form.
export const buildCourseDataArray = async (courseId: any, safeFields: boolean) => {
  const modules = await ModuleModel.find({ course: courseId }).sort({ order: 1 });
  const lessons = await LessonModel.find({ course: courseId }).sort({ order: 1 });

  const lessonsByModule = new Map<string, any[]>();
  for (const lesson of lessons) {
    const key = String(lesson.module);
    if (!lessonsByModule.has(key)) lessonsByModule.set(key, []);
    lessonsByModule.get(key)!.push(lesson);
  }

  const flattened: any[] = [];
  for (const module of modules) {
    for (const lesson of lessonsByModule.get(String(module._id)) || []) {
      const item: any = {
        _id: lesson._id,
        title: lesson.title,
        description: lesson.description,
        videoThumbnail: lesson.videoThumbnail,
        videoSection: module.title,
        videoLength: lesson.videoLength,
        videoPlayer: lesson.videoPlayer,
      };
      if (!safeFields) {
        item.videoUrl = lesson.videoUrl;
        item.links = lesson.links;
        item.suggestion = lesson.suggestion;
        item.questions = (lesson.questions || []).map(toPublicQuestion);
      }
      flattened.push(item);
    }
  }
  return flattened;
};
