import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ path: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("@/hooks/redux", () => ({ useAppSelector: () => ({ user: null }) }));
vi.mock("@/redux/features/auth/authApi", () => ({ useLazyLogOutQuery: () => [vi.fn()] }));
vi.mock("../../src/components/NotificationBell", () => ({ default: () => null }));

import Header from "../../src/components/Header";

describe("Header on a phone", () => {
  it("opens and closes the full-screen menu with the button and Escape", () => {
    render(<Header />);
    const button = screen.getByRole("button", { name: "Toggle menu" });
    const menu = document.getElementById("mobile-menu")!;

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(menu.getAttribute("aria-hidden")).toBe("true");
    expect(menu.className).toContain("invisible");

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(menu.getAttribute("aria-hidden")).toBe("false");
    expect(menu.className).toContain("visible");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");
  });

  it("closes when you pick a link, and offers log in / sign up to visitors", () => {
    render(<Header />);
    const button = screen.getByRole("button", { name: "Toggle menu" });
    fireEvent.click(button);

    const mobile = screen.getByRole("navigation", { name: "Mobile", hidden: true });
    expect(mobile.textContent).toContain("Log in");
    expect(mobile.textContent).toContain("Create account");

    // jsdom can't navigate - stop the real <a> from trying
    document.addEventListener("click", (e) => e.preventDefault(), { once: true });
    fireEvent.click(mobile.querySelector('a[href="/about"]')!);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
