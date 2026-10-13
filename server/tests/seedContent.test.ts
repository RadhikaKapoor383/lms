import { describe, expect, it } from "vitest";
import { validateQuestion } from "../src/services/quizGrading.service";
import {
  CATEGORIES, COURSES, INSTRUCTORS, INSTRUCTOR_EMAIL_DOMAIN, QUESTION_BANKS, STUDENT_EMAIL_DOMAIN,
} from "../src/seedData/statsContent";

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
});
