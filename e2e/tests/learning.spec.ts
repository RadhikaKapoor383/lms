import { test, expect } from "@playwright/test";
import { ObjectId } from "mongodb";
import { INSTRUCTOR, TAG, findEnrolledStudent, login, withDb } from "./helpers";

test.afterAll(async () => {
  await withDb((db) => db.collection("discussions").deleteMany({ title: { $regex: `^${TAG}` } }));
});

test("a student asks about a lesson and sees what's left for the certificate", async ({ page }) => {
  const student = await findEnrolledStudent();
  await login(page, student);
  await page.goto(`/course-access/${student.courseId}`);

  await expect(page.getByText("To earn the certificate for this course:")).toBeVisible();

  const section = page.getByRole("region", { name: "Questions about this lesson" });
  await section.getByLabel("Question title").fill(`${TAG} question`);
  await section.getByLabel("Question details").fill("What does this part mean?");
  await section.getByRole("button", { name: "Ask about this lesson" }).click();
  await expect(section.getByRole("status")).toContainText("Posted");
  await expect(section.getByRole("link", { name: `${TAG} question` })).toBeVisible();
});

test("an instructor sets completion rules for a course", async ({ page }) => {
  const { courseId } = await findEnrolledStudent();
  const before = await withDb((db) => db.collection("courses").findOne({ _id: new ObjectId(courseId) }));
  await login(page, INSTRUCTOR);
  await page.goto(`/instructor/courses/${courseId}/completion`);
  await page.getByLabel(/Share of lessons/).fill("90");
  await page.getByLabel("Quizzes are optional").check();
  await page.getByRole("button", { name: "Save rules" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await expect(page.getByText("Finish at least 90% of the lessons")).toBeVisible();

  // put the course back as it was
  await withDb((db) =>
    db.collection("courses").updateOne(
      { _id: before!._id },
      before!.completionRules ? { $set: { completionRules: before!.completionRules } } : { $unset: { completionRules: 1 } }
    )
  );
});
