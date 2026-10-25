import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// The RTK Query hooks are replaced with plain fakes, so the page is tested on
// its own: what it shows and what it asks the server to do.
// Inside vi.hoisted because vi.mock below is moved to the top of the file,
// before any ordinary top-level code runs.
const api = vi.hoisted(() => ({
  departments: [] as any[],
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  mutation: (fn: any) => () => [(arg: any) => ({ unwrap: () => fn(arg) }), { isLoading: false }],
}));

vi.mock("@/redux/features/departments/departmentsApi", () => ({
  useGetDepartmentsQuery: () => ({ data: { departments: api.departments }, isLoading: false, isError: false }),
  useCreateDepartmentMutation: api.mutation(api.create),
  useUpdateDepartmentMutation: api.mutation(api.update),
  useDeleteDepartmentMutation: api.mutation(api.remove),
}));

import AdminDepartmentsPage from "../../src/app/admin/departments/page";

beforeEach(() => {
  api.departments = [
    { _id: "d1", name: "Computer Science", courseCount: 3, instructorCount: 2 },
    { _id: "d2", name: "Philosophy", courseCount: 0, instructorCount: 0 },
  ];
  api.create.mockReset().mockResolvedValue({});
  api.update.mockReset().mockResolvedValue({});
  api.remove.mockReset().mockResolvedValue({});
});

describe("Admin departments page", () => {
  it("lists departments with how many courses and instructors use them", () => {
    render(<AdminDepartmentsPage />);
    expect(screen.getByText("Computer Science")).toBeTruthy();
    expect(screen.getByText("3 courses · 2 instructors")).toBeTruthy();
    expect(screen.getByText("0 courses · 0 instructors")).toBeTruthy();
  });

  it("only lets an unused department be deleted, after a confirm", async () => {
    render(<AdminDepartmentsPage />);
    const [csDelete, philosophyDelete] = screen.getAllByRole("button", { name: "Delete" }) as HTMLButtonElement[];
    expect(csDelete.disabled).toBe(true);
    expect(philosophyDelete.disabled).toBe(false);

    fireEvent.click(philosophyDelete);
    expect(api.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("d2"));
  });

  it("adds a department with a trimmed name and clears the box", async () => {
    render(<AdminDepartmentsPage />);
    const box = screen.getByLabelText("New department name") as HTMLInputElement;
    fireEvent.change(box, { target: { value: "  Arts & Design " } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith("Arts & Design"));
    await waitFor(() => expect(box.value).toBe(""));
  });

  it("shows the server's reason when a name is taken", async () => {
    api.create.mockRejectedValue({ data: { message: "That department already exists" } });
    render(<AdminDepartmentsPage />);
    fireEvent.change(screen.getByLabelText("New department name"), { target: { value: "philosophy" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect((await screen.findByRole("alert")).textContent).toBe("That department already exists");
  });

  it("renames a department", async () => {
    render(<AdminDepartmentsPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[1]);
    const box = screen.getByLabelText("New name for Philosophy");
    fireEvent.change(box, { target: { value: "Philosophy & Ethics" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith({ id: "d2", name: "Philosophy & Ethics" }));
  });
});
