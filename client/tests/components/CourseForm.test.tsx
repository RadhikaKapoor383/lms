import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/redux/features/categories/categoriesApi", () => ({
  useGetCategoriesQuery: () => ({ data: { categories: [{ _id: "c1", name: "Programming" }] }, isLoading: false }),
}));
vi.mock("@/redux/features/departments/departmentsApi", () => ({
  useGetDepartmentsQuery: () => ({
    data: {
      departments: [
        { _id: "d1", name: "Computer Science" },
        { _id: "d2", name: "Business School" },
      ],
    },
    isLoading: false,
  }),
}));

import CourseForm from "../../src/components/CourseForm";

const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector("form")!);

describe("CourseForm department", () => {
  it("lists the departments with 'No department' first", () => {
    render(<CourseForm onSubmit={() => {}} isSubmitting={false} />);
    const select = screen.getByLabelText("Department") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      "No department",
      "Computer Science",
      "Business School",
    ]);
    expect(select.value).toBe("");
  });

  it("sends the chosen department id", () => {
    const onSubmit = vi.fn();
    const { container } = render(<CourseForm onSubmit={onSubmit} isSubmitting={false} />);
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "d2" } });
    submit(container);
    expect(onSubmit.mock.calls[0][0].department).toBe("d2");
  });

  it("sends an empty department when none is chosen", () => {
    const onSubmit = vi.fn();
    const { container } = render(<CourseForm onSubmit={onSubmit} isSubmitting={false} />);
    submit(container);
    expect(onSubmit.mock.calls[0][0].department).toBe("");
  });

  it("starts from the saved department when editing, and can clear it", () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <CourseForm initialValues={{ department: "d1" }} onSubmit={onSubmit} isSubmitting={false} />
    );
    const select = screen.getByLabelText("Department") as HTMLSelectElement;
    expect(select.value).toBe("d1");
    fireEvent.change(select, { target: { value: "" } });
    submit(container);
    expect(onSubmit.mock.calls[0][0].department).toBe("");
  });

  it("shows the hint when one is given (the instructor's create page)", () => {
    render(
      <CourseForm onSubmit={() => {}} isSubmitting={false} departmentHint="Leave empty to use your own department." />
    );
    expect(screen.getByText("Leave empty to use your own department.")).toBeTruthy();
  });
});
