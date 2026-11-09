import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import LessonLedger from "../../src/components/ledger/LessonLedger";
import ContinueCard from "../../src/components/ledger/ContinueCard";

const lessons = [
  { _id: "a", title: "Getting set up" },
  { _id: "b", title: "Core ideas" },
  { _id: "c", title: "First project" },
];

describe("LessonLedger", () => {
  it("numbers the lessons, marks finished ones and shows the total", () => {
    render(<LessonLedger lessons={lessons} activeIndex={1} completedIds={["a"]} showProgress onSelect={() => {}} />);
    expect(screen.getByText("01")).toBeTruthy();
    expect(screen.getByText("03")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Getting set up \(finished\)/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Core ideas \(open now\)/ }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByText("1 of 3")).toBeTruthy();
  });

  it("opens the lesson you pick", () => {
    const onSelect = vi.fn();
    render(<LessonLedger lessons={lessons} activeIndex={0} completedIds={[]} showProgress onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /First project/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("only counts finished lessons that are still in the course", () => {
    render(<LessonLedger lessons={lessons} activeIndex={0} completedIds={["a", "deleted-lesson"]} showProgress onSelect={() => {}} />);
    expect(screen.getByText("1 of 3")).toBeTruthy();
  });

  it("for a preview (admin/instructor) shows no progress, status or total", () => {
    render(<LessonLedger lessons={lessons} activeIndex={0} completedIds={["a"]} showProgress={false} onSelect={() => {}} />);
    expect(screen.queryByText("TOTAL")).toBeNull();
    expect(screen.queryByText(/finished/)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });
});

describe("ContinueCard", () => {
  it("shows the balance and a button for the next lesson", () => {
    const onContinue = vi.fn();
    render(<ContinueCard percent={59.6} doneCount={3} total={5} nextTitle="Quiz time" onContinue={onContinue} />);
    expect(screen.getByRole("progressbar", { name: "Course progress" }).getAttribute("aria-valuenow")).toBe("60");
    expect(screen.getByText("3 of 5 lessons posted")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue: Quiz time" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("when everything is done there is no button, just a closing line", () => {
    render(<ContinueCard percent={100} doneCount={5} total={5} onContinue={() => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Every lesson is posted.")).toBeTruthy();
  });

  it("keeps the percentage inside 0 to 100", () => {
    render(<ContinueCard percent={140} doneCount={1} total={1} onContinue={() => {}} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
  });
});
