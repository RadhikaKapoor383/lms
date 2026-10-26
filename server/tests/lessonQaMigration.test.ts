import { describe, expect, it } from "vitest";
import { questionToThread } from "../src/services/lessonQaMigration.service";

const lesson = { _id: "L1", course: "C1", title: "Routing" };
const fallback = new Date("2025-01-01T00:00:00Z");
const roles = new Map([["u-old", "instructor"]]);

describe("moving a lesson question into Discussions", () => {
  it("keeps the asker, the text, the answers and their dates", () => {
    const t = questionToThread(
      {
        _id: "Q1",
        user: { _id: "u1", name: "Ali", role: "student", email: "never@copied.example" },
        question: "Why 404?\nI followed every step.",
        createdAt: "2025-03-01T10:00:00Z",
        questionReplies: [
          { user: { _id: "u2", name: "Sana", role: "instructor" }, answer: "Check the path.", createdAt: "2025-03-02T09:00:00Z" },
          { user: { _id: "u3", name: "Bilal" }, answer: "  ", createdAt: "2025-03-03T09:00:00Z" }, // empty: dropped
        ],
      },
      lesson,
      roles,
      fallback
    )!;
    expect(t).toMatchObject({
      course: "C1", lesson: "L1", migratedFrom: "lesson-question:L1:Q1",
      author: "u1", authorName: "Ali", authorRole: "student",
      title: "Why 404?", body: "Why 404?\nI followed every step.", pinned: false,
    });
    expect(t.replies).toHaveLength(1);
    expect(t.replies[0]).toMatchObject({ author: "u2", authorName: "Sana", authorRole: "instructor", body: "Check the path." });
    expect(t.createdAt.toISOString()).toBe("2025-03-01T10:00:00.000Z");
    expect(t.lastActivityAt.toISOString()).toBe("2025-03-02T09:00:00.000Z");
    expect(JSON.stringify(t)).not.toContain("never@copied.example"); // emails stay behind
  });

  it("fills a missing role from the account, then falls back to student; a missing date uses the lesson's", () => {
    const t = questionToThread({ _id: "Q2", user: { _id: "u-old", name: "Old" }, question: "Hi" }, lesson, roles, fallback)!;
    expect(t.authorRole).toBe("instructor");
    expect(t.createdAt).toEqual(fallback);
    const u = questionToThread({ _id: "Q3", user: { _id: "nobody" }, question: "Hi" }, lesson, roles, fallback)!;
    expect(u.authorRole).toBe("student");
    expect(u.authorName).toBe("Student");
  });

  it("shortens a very long first line for the title, keeps the full text as the message", () => {
    const long = "x".repeat(400);
    const t = questionToThread({ _id: "Q4", user: { _id: "u1" }, question: long }, lesson, roles, fallback)!;
    expect(t.title.length).toBe(150);
    expect(t.title.endsWith("…")).toBe(true);
    expect(t.body).toBe(long);
  });

  it("skips questions with no text or no asker", () => {
    expect(questionToThread({ _id: "Q5", user: { _id: "u1" }, question: "  " }, lesson, roles, fallback)).toBeNull();
    expect(questionToThread({ _id: "Q6", question: "Hello" }, lesson, roles, fallback)).toBeNull();
  });
});
