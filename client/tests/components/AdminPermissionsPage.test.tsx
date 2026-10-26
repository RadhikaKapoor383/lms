import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ rows: [] as any[], save: vi.fn() }));
vi.mock("@/redux/features/permissions/permissionsApi", () => ({
  useGetRolePermissionsQuery: () => ({ data: { permissions: api.rows }, isLoading: false, isError: false }),
  useUpdateRolePermissionsMutation: () => [(arg: any) => ({ unwrap: () => api.save(arg) }), { isLoading: false }],
}));

import AdminPermissionsPage from "../../src/app/admin/permissions/page";

beforeEach(() => {
  api.rows = [
    { key: "quiz.manage", role: "instructor", label: "create, edit and delete quizzes", allowed: true },
    { key: "course.create", role: "instructor", label: "create new courses", allowed: true },
    { key: "review.write", role: "student", label: "write course reviews", allowed: false },
  ];
  api.save.mockReset();
  api.save.mockResolvedValue({});
});

describe("Admin permissions page", () => {
  it("shows each role's switches as saved", () => {
    render(<AdminPermissionsPage />);
    expect((screen.getByLabelText("Instructors may create, edit and delete quizzes") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Students may write course reviews") as HTMLInputElement).checked).toBe(false);
  });

  it("saves only after a change, sending every switch per role", async () => {
    render(<AdminPermissionsPage />);
    const saveButton = screen.getByRole("button", { name: "Save permissions" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Instructors may create, edit and delete quizzes"));
    expect(saveButton.disabled).toBe(false);
    fireEvent.click(saveButton);
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith({
        instructor: { "quiz.manage": false, "course.create": true },
        student: { "review.write": false },
      })
    );
    expect((await screen.findByRole("status")).textContent).toMatch(/Saved/);
  });

  it("can undo unsaved changes", () => {
    render(<AdminPermissionsPage />);
    const box = screen.getByLabelText("Instructors may create new courses") as HTMLInputElement;
    fireEvent.click(box);
    expect(box.checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Undo changes" }));
    expect((screen.getByLabelText("Instructors may create new courses") as HTMLInputElement).checked).toBe(true);
  });
});
