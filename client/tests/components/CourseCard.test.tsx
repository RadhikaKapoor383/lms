import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import CourseCard from "../../src/components/CourseCard";

const base = { _id: "c1", name: "Course", description: "", level: "Beginner", price: 10 };

describe("CourseCard", () => {
  it("shows the department and the effective length from search results", () => {
    render(<CourseCard course={{ ...base, department: { _id: "d", name: "Data & Analytics" }, durationMinutes: 36 }} />);
    expect(screen.getByText("Data & Analytics")).toBeTruthy();
    expect(screen.getByText(/Beginner · 36m/)).toBeTruthy();
  });

  it("uses the instructor's hours on the plain course list (no durationMinutes there)", () => {
    render(<CourseCard course={{ ...base, durationHours: 12 }} />);
    expect(screen.getByText(/Beginner · 12h/)).toBeTruthy();
  });

  it("shows neither when the course has no department or length", () => {
    const { container } = render(<CourseCard course={base} />);
    expect(container.textContent).not.toContain("·");
  });
});
