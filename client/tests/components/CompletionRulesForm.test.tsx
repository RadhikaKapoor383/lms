import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ data: {} as any, save: vi.fn() }));
vi.mock("@/redux/features/courses/coursesApi", () => ({
  useGetCompletionRulesQuery: () => ({ data: api.data, isLoading: false, isError: false }),
  useUpdateCompletionRulesMutation: () => [(arg: any) => ({ unwrap: () => api.save(arg) }), { isLoading: false }],
}));

import CompletionRulesForm from "../../src/components/CompletionRulesForm";

beforeEach(() => {
  api.data = {
    rules: { lessonPercent: 100, quizzes: "all", quizIds: [], assignments: "none", assignmentPassPercent: 50 },
    summary: ["Finish every lesson", "Pass every quiz"],
    quizzes: [
      { _id: "q1", title: "Mid-term" },
      { _id: "q2", title: "Final" },
    ],
    assignmentCount: 2,
  };
  api.save.mockReset();
  api.save.mockResolvedValue({});
});

describe("Completion rules form", () => {
  it("starts from the saved rules and shows them in words", () => {
    render(<CompletionRulesForm courseId="c1" />);
    expect((screen.getByLabelText(/Share of lessons/) as HTMLInputElement).value).toBe("100");
    expect((screen.getByLabelText("Pass every quiz") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("Finish every lesson")).toBeTruthy();
  });

  it("sends the chosen rules: some lessons, selected quizzes, passed assignments", async () => {
    render(<CompletionRulesForm courseId="c1" />);
    fireEvent.change(screen.getByLabelText(/Share of lessons/), { target: { value: "80" } });
    fireEvent.click(screen.getByLabelText("Pass only the quizzes I choose"));
    fireEvent.click(screen.getByLabelText("Final"));
    fireEvent.click(screen.getByLabelText("Pass every assignment"));
    fireEvent.change(screen.getByLabelText(/Pass mark/), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rules" }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith({
        courseId: "c1",
        rules: { lessonPercent: 80, quizzes: "selected", quizIds: ["q2"], assignments: "passed", assignmentPassPercent: 60 },
      })
    );
    expect((await screen.findByRole("status")).textContent).toMatch(/Saved/);
  });

  it("shows the server's reason when saving fails", async () => {
    api.save.mockRejectedValue({ data: { message: "Choose at least one quiz, or pick \"none\"" } });
    render(<CompletionRulesForm courseId="c1" />);
    fireEvent.click(screen.getByLabelText("Pass only the quizzes I choose"));
    fireEvent.click(screen.getByRole("button", { name: "Save rules" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/at least one quiz/);
  });
});
