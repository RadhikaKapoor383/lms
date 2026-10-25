import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ setDepartment: vi.fn() }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/redux/features/admin/adminApi", () => ({
  useGetInstructorsQuery: () => ({
    data: {
      instructors: [
        {
          _id: "u1", name: "Sana Ahmed", email: "sana@x.example", isActive: true,
          department: { _id: "d1", name: "Computer Science" },
          courses: 2, published: 2, pending: 0, students: 40, completionRate: 50,
        },
        {
          _id: "u2", name: "New Teacher", email: "new@x.example", isActive: true, department: null,
          courses: 0, published: 0, pending: 0, students: 0, completionRate: 0,
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/redux/features/departments/departmentsApi", () => ({
  useGetDepartmentsQuery: () => ({
    data: { departments: [{ _id: "d1", name: "Computer Science" }, { _id: "d2", name: "Business School" }] },
  }),
  useSetInstructorDepartmentMutation: () => [
    (arg: any) => ({ unwrap: () => api.setDepartment(arg) }),
    { isLoading: false },
  ],
}));

import AdminInstructorsPage from "../../src/app/admin/instructors/page";

// Braces matter: a function returned from beforeEach is run as a cleanup after
// the test, which would call the (possibly rejecting) mock.
beforeEach(() => {
  api.setDepartment.mockReset().mockResolvedValue({});
});

describe("Admin instructors page - departments", () => {
  it("shows each instructor's current department", () => {
    render(<AdminInstructorsPage />);
    expect((screen.getByLabelText("Department for Sana Ahmed") as HTMLSelectElement).value).toBe("d1");
    expect((screen.getByLabelText("Department for New Teacher") as HTMLSelectElement).value).toBe("");
  });

  it("puts an instructor in a department, and takes them out again", async () => {
    render(<AdminInstructorsPage />);
    fireEvent.change(screen.getByLabelText("Department for New Teacher"), { target: { value: "d2" } });
    await waitFor(() => expect(api.setDepartment).toHaveBeenCalledWith({ instructorId: "u2", departmentId: "d2" }));
    fireEvent.change(screen.getByLabelText("Department for Sana Ahmed"), { target: { value: "" } });
    await waitFor(() => expect(api.setDepartment).toHaveBeenCalledWith({ instructorId: "u1", departmentId: "" }));
  });

  it("shows the server's reason if the change fails", async () => {
    api.setDepartment.mockRejectedValue({ data: { message: "Department not found" } });
    render(<AdminInstructorsPage />);
    fireEvent.change(screen.getByLabelText("Department for New Teacher"), { target: { value: "d2" } });
    expect((await screen.findByRole("alert")).textContent).toBe("Department not found");
  });
});
