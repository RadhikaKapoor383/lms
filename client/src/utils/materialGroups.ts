// Groups a course's materials by the lesson they're attached to, in lesson
// order, with "whole course" files first. A material whose lesson no longer
// exists (or that has none) counts as a whole-course file.

export type MaterialGroup = { lessonId: string | null; title: string; materials: any[] };

export const groupMaterialsByLesson = (materials: any[], lessons: { _id: string; title: string }[]): MaterialGroup[] => {
  const known = new Set(lessons.map((l) => String(l._id)));
  const byLesson = new Map<string, any[]>();
  const general: any[] = [];
  for (const m of materials || []) {
    const id = m?.lesson ? String(m.lesson) : "";
    if (id && known.has(id)) {
      if (!byLesson.has(id)) byLesson.set(id, []);
      byLesson.get(id)!.push(m);
    } else {
      general.push(m);
    }
  }
  const groups: MaterialGroup[] = [];
  if (general.length) groups.push({ lessonId: null, title: "Whole course", materials: general });
  lessons.forEach((l, i) => {
    const list = byLesson.get(String(l._id));
    if (list?.length) groups.push({ lessonId: String(l._id), title: `Lesson ${i + 1}: ${l.title}`, materials: list });
  });
  return groups;
};

export const materialsForLesson = (materials: any[], lessonId: string | undefined) =>
  lessonId ? (materials || []).filter((m) => m?.lesson && String(m.lesson) === String(lessonId)) : [];
