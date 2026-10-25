import { describe, expect, it } from "vitest";
import { validateQuestion } from "../src/services/quizGrading.service";
import {
  CATEGORIES, COURSES, DEPARTMENTS, INSTRUCTORS, INSTRUCTOR_EMAIL_DOMAIN, QUESTION_BANKS, STUDENT_EMAIL_DOMAIN,
  courseDepartment,
} from "../src/seedData/statsContent";
import { DURATION_OPTIONS, matchesDuration } from "../src/services/courseSearch.service";

// The sample-data script (npm run seed:stats) writes straight into the database,
// so nothing checks its content on the way in. These tests do, using the app's own rules.

describe("sample data content", () => {
  it("every quiz question passes the same validation real quizzes go through", () => {
    for (const [category, bank] of Object.entries(QUESTION_BANKS)) {
      for (const q of bank) {
        const asSaved = {
          questionText: q.text, type: q.type, marks: q.marks,
          options: (q.options || []).map((o) => ({ text: o.text, isCorrect: o.correct })), acceptedAnswers: q.accepted || [],
        };
        expect(validateQuestion(asSaved), `${category}: ${q.text}`).toBeNull();
      }
    }
  });

  it("each category has enough questions for a 6-question quiz, with every type present", () => {
    for (const category of CATEGORIES) {
      const bank = QUESTION_BANKS[category];
      expect(bank, category).toBeDefined();
      expect(bank.length).toBeGreaterThanOrEqual(6);
      for (const type of ["single", "multiple", "trueFalse", "shortAnswer"]) {
        expect(bank.some((q) => q.type === type), `${category} has no ${type}`).toBe(true);
      }
    }
  });

  it("every course points at a real category and instructor, and has lessons", () => {
    for (const c of COURSES) {
      expect(CATEGORIES, c.name).toContain(c.category);
      expect(INSTRUCTORS[c.instructor], c.name).toBeDefined();
      expect(c.modules.length, c.name).toBeGreaterThan(0);
      expect(c.modules.every((m) => m.lessons.length > 0), c.name).toBe(true);
      expect(c.durationHours).toBeGreaterThan(0);
    }
  });

  it("there are published courses to enrol in, plus pending, draft, archived and rejected ones", () => {
    const statuses = new Set(COURSES.map((c) => c.status));
    for (const s of ["Published", "Pending Approval", "Draft", "Archived", "Rejected"]) expect(statuses.has(s as any), s).toBe(true);
    expect(COURSES.filter((c) => c.status === "Published").every((c) => c.popularity > 0)).toBe(true);
  });

  it("course names and instructor names are unique", () => {
    expect(new Set(COURSES.map((c) => c.name)).size).toBe(COURSES.length);
    expect(new Set(INSTRUCTORS.map((i) => i.slug)).size).toBe(INSTRUCTORS.length);
  });

  it("seeded e-mail addresses use reserved .example domains, so they can never reach a real inbox", () => {
    expect(STUDENT_EMAIL_DOMAIN).toMatch(/\.example$/);
    expect(INSTRUCTOR_EMAIL_DOMAIN).toMatch(/\.example$/);
  });

  it("every instructor and course is in a real department, and the filters have something to show", () => {
    expect(new Set(DEPARTMENTS).size).toBe(DEPARTMENTS.length);
    for (const i of INSTRUCTORS) expect(DEPARTMENTS, i.name).toContain(i.department);
    const published = COURSES.filter((c) => c.status === "Published");
    for (const c of COURSES) {
      const d = courseDepartment(c);
      if (d !== null) expect(DEPARTMENTS, c.name).toContain(d);
    }
    // every department has at least one published course
    for (const d of DEPARTMENTS) {
      expect(published.some((c) => courseDepartment(c) === d), d).toBe(true);
    }
    // the edge cases the UI must handle: a course outside its instructor's
    // department, and a published course with no department at all
    expect(COURSES.some((c) => c.department && c.department !== INSTRUCTORS[c.instructor].department)).toBe(true);
    expect(published.some((c) => courseDepartment(c) === null)).toBe(true);
  });

  it("published courses land in more than one duration bucket", () => {
    const buckets = new Set(
      COURSES.filter((c) => c.status === "Published").flatMap((c) =>
        DURATION_OPTIONS.filter((o) => matchesDuration(c.durationHours * 60, o.value)).map((o) => o.value)
      )
    );
    expect(buckets.size).toBeGreaterThanOrEqual(2);
  });
});
