import { describe, expect, it } from "vitest";
import { groupMaterialsByLesson, materialsForLesson } from "../src/utils/materialGroups";

const lessons = [
  { _id: "l1", title: "Intro" },
  { _id: "l2", title: "Routes" },
];
const m = (id: string, lesson?: string) => ({ _id: id, title: id, lesson });

describe("materials by lesson", () => {
  it("puts whole-course files first, then lessons in lesson order, skipping empty lessons", () => {
    const groups = groupMaterialsByLesson([m("a", "l2"), m("b"), m("c", "l2")], lessons);
    expect(groups.map((g) => g.title)).toEqual(["Whole course", "Lesson 2: Routes"]);
    expect(groups[1].materials.map((x) => x._id)).toEqual(["a", "c"]);
  });
  it("treats a file whose lesson is gone as a whole-course file", () => {
    const groups = groupMaterialsByLesson([m("a", "deleted")], lessons);
    expect(groups).toEqual([{ lessonId: null, title: "Whole course", materials: [m("a", "deleted")] }]);
  });
  it("returns nothing for no materials", () => {
    expect(groupMaterialsByLesson([], lessons)).toEqual([]);
  });
  it("finds one lesson's files", () => {
    expect(materialsForLesson([m("a", "l1"), m("b"), m("c", "l2")], "l1").map((x) => x._id)).toEqual(["a"]);
    expect(materialsForLesson([m("a", "l1")], undefined)).toEqual([]);
  });
});
