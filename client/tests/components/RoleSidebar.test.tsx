import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ path: "/admin/departments" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import AdminSidebar from "../../src/components/AdminSidebar";

describe("Admin / instructor sidebar on a phone", () => {
  it("starts folded behind a Menu button, which opens and closes it", () => {
    render(<AdminSidebar />);
    const button = screen.getByRole("button", { name: "Menu" });
    const menu = document.getElementById("admin-menu")!;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(menu.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(menu.className).toContain("md:flex"); // always shown on a wide screen

    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Close" }).getAttribute("aria-expanded")).toBe("true");
    expect(menu.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("marks only the current page, never Overview on a page below it", () => {
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: "Departments" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBeNull();
  });
});
