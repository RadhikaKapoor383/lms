import { describe, expect, it } from "vitest";
import {
  isChoiceCorrect,
  isShortAnswerCorrect,
  normalizeAnswer,
  normalizeQuestion,
  validateQuestion,
} from "../src/services/quizGrading.service";

describe("short answer grading", () => {
  it("ignores case and extra spaces", () => {
    expect(normalizeAnswer("  Photo   SYNTHESIS ")).toBe("photo synthesis");
    expect(isShortAnswerCorrect("  PHOTOSYNTHESIS ", ["photosynthesis"])).toBe(true);
  });
  it("accepts any of the accepted answers", () => {
    expect(isShortAnswerCorrect("Karachi", ["Karachi", "khi"])).toBe(true);
    expect(isShortAnswerCorrect("khi", ["Karachi", "khi"])).toBe(true);
  });
  it("rejects wrong, empty and non-text answers", () => {
    expect(isShortAnswerCorrect("Lahore", ["Karachi"])).toBe(false);
    expect(isShortAnswerCorrect("   ", ["Karachi"])).toBe(false);
    expect(isShortAnswerCorrect(undefined, ["Karachi"])).toBe(false);
    expect(isShortAnswerCorrect(42 as any, ["42"])).toBe(false);
  });
});

describe("choice grading", () => {
  it("needs exactly the correct set", () => {
    expect(isChoiceCorrect(new Set([0, 2]), new Set([0, 2]))).toBe(true);
    expect(isChoiceCorrect(new Set([0]), new Set([0, 2]))).toBe(false); // missing one
    expect(isChoiceCorrect(new Set([0, 1, 2]), new Set([0, 2]))).toBe(false); // extra one
    expect(isChoiceCorrect(new Set(), new Set([1]))).toBe(false); // unanswered
  });
});

describe("validateQuestion", () => {
  const opts = (...flags: boolean[]) => flags.map((f, i) => ({ text: `o${i}`, isCorrect: f }));

  it("accepts a good single, multiple, true/false and short-answer question", () => {
    expect(validateQuestion({ questionText: "q", type: "single", options: opts(true, false) })).toBeNull();
    expect(validateQuestion({ questionText: "q", type: "multiple", options: opts(true, true, false) })).toBeNull();
    expect(validateQuestion({ questionText: "q", type: "trueFalse", options: opts(true, false) })).toBeNull();
    expect(validateQuestion({ questionText: "q", type: "shortAnswer", acceptedAnswers: ["a"] })).toBeNull();
  });
  it("rejects a single question with two correct options", () => {
    expect(validateQuestion({ questionText: "q", type: "single", options: opts(true, true) })).toMatch(/exactly one/);
  });
  it("rejects no correct option, too few options and blank options", () => {
    expect(validateQuestion({ questionText: "q", type: "single", options: opts(false, false) })).toMatch(/no correct/);
    expect(validateQuestion({ questionText: "q", type: "single", options: opts(true) })).toMatch(/at least 2/);
    expect(validateQuestion({ questionText: "q", type: "single", options: [{ text: " ", isCorrect: true }, { text: "b" }] })).toMatch(/empty option/);
  });
  it("rejects a short-answer question with no usable accepted answer", () => {
    expect(validateQuestion({ questionText: "q", type: "shortAnswer", acceptedAnswers: [] })).toMatch(/accepted answer/);
    expect(validateQuestion({ questionText: "q", type: "shortAnswer", acceptedAnswers: ["  "] })).toMatch(/accepted answer/);
  });
  it("rejects unknown types and missing text", () => {
    expect(validateQuestion({ questionText: "q", type: "essay" })).toMatch(/unknown/);
    expect(validateQuestion({ questionText: " ", type: "single", options: opts(true, false) })).toMatch(/text/);
  });
});

describe("normalizeQuestion", () => {
  it("drops options from short-answer questions and answers from the rest", () => {
    const sa = normalizeQuestion({
      questionText: " q ", type: "shortAnswer", marks: 2,
      options: [{ text: "x", isCorrect: true }], acceptedAnswers: [" a ", ""],
    });
    expect(sa.options).toEqual([]);
    expect(sa.acceptedAnswers).toEqual(["a"]);

    const single = normalizeQuestion({
      questionText: "q", type: "single",
      options: [{ text: " a ", isCorrect: true }, { text: "b" }], acceptedAnswers: ["leak"],
    });
    expect(single.acceptedAnswers).toEqual([]);
    expect(single.options).toEqual([{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }]);
  });
});
