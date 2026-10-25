import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  filters: {} as any,
  results: { courses: [] as any[], total: 0, totalPages: 1, page: 1 },
  searchCalls: [] as Record<string, string>[],
}));

vi.mock("@/redux/features/courses/coursesApi", () => ({
  useSearchCoursesQuery: (params: Record<string, string>) => {
    api.searchCalls.push(params);
    return { data: api.results, isFetching: false, isError: false };
  },
  useGetCourseFiltersQuery: () => ({ data: api.filters }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import CourseSearch from "../../src/components/CourseSearch";

const lastParams = () => api.searchCalls[api.searchCalls.length - 1];

beforeEach(() => {
  api.searchCalls = [];
  api.filters = {
    categories: [],
    departments: [
      { _id: "d1", name: "Business School" },
      { _id: "d2", name: "Computer Science" },
    ],
    instructors: [],
    levels: ["Beginner"],
    durations: [
      { value: "short", label: "Up to 2 hours" },
      { value: "medium", label: "2 to 10 hours" },
      { value: "long", label: "Over 10 hours" },
    ],
  };
  api.results = {
    courses: [
      {
        _id: "c1",
        name: "React for Beginners",
        description: "Components and state.",
        level: "Beginner",
        price: 0,
        department: { _id: "d2", name: "Computer Science" },
        instructor: { _id: "u1", name: "Sana Ahmed" },
        durationMinutes: 840,
        durationHours: 14,
        reviewCount: 0,
      },
    ],
    total: 1,
    totalPages: 1,
    page: 1,
  };
});

describe("Course search", () => {
  it("offers a department filter and sends the chosen department", async () => {
    render(<CourseSearch />);
    const select = screen.getByLabelText("Department") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      "All departments",
      "Business School",
      "Computer Science",
    ]);

    fireEvent.change(select, { target: { value: "d2" } });
    await waitFor(() => expect(lastParams()).toMatchObject({ department: "d2", page: "1" }));

    fireEvent.change(select, { target: { value: "" } });
    await waitFor(() => expect(lastParams().department).toBeUndefined());
  });

  it("hides the department filter when no published course has a department", () => {
    api.filters.departments = [];
    render(<CourseSearch />);
    expect(screen.queryByLabelText("Department")).toBeNull();
  });

  it("shows readable duration labels, not short/medium/long", () => {
    render(<CourseSearch />);
    const labels = [...(screen.getByLabelText("Duration") as HTMLSelectElement).options].map((o) => o.textContent);
    expect(labels).toEqual(["Any length", "Up to 2 hours", "2 to 10 hours", "Over 10 hours"]);
  });

  it("still shows readable labels if the server sends bare bucket names", () => {
    api.filters.durations = ["short", "medium", "long"];
    render(<CourseSearch />);
    const labels = [...(screen.getByLabelText("Duration") as HTMLSelectElement).options].map((o) => o.textContent);
    expect(labels).not.toContain("short");
    expect(labels).toContain("Up to 2 hours");
  });

  it("sends the duration bucket's value", async () => {
    render(<CourseSearch />);
    fireEvent.change(screen.getByLabelText("Duration"), { target: { value: "long" } });
    await waitFor(() => expect(lastParams()).toMatchObject({ duration: "long" }));
  });

  it("shows the department and length on each result card", () => {
    render(<CourseSearch />);
    expect(screen.getByText(/Computer Science · Sana Ahmed/)).toBeTruthy();
    expect(screen.getByText(/Beginner · 14h/)).toBeTruthy();
  });
});
