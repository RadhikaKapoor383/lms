import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../../src/components/Header", () => ({ default: () => <header>header</header> }));
vi.mock("../../src/components/Footer", () => ({ default: () => <footer>footer</footer> }));

import NotFound from "../../src/app/not-found";
import ErrorPage from "../../src/app/error";
import EmptyLedger from "../../src/components/ledger/EmptyLedger";

describe("404 page", () => {
  it("says the entry was not found and offers the way back", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Entry not found" })).toBeTruthy();
    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to the catalog" }).getAttribute("href")).toBe("/courses");
  });
});

describe("error page", () => {
  it("announces the problem and 'Try again' runs reset", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("boom")} reset={reset} />);
    expect(screen.getByRole("alert").textContent).toContain("That entry didn't post");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Back to the home page" }).getAttribute("href")).toBe("/");
  });

  it("does not show the error message to visitors", () => {
    render(<ErrorPage error={new Error("secret database detail")} reset={() => {}} />);
    expect(screen.queryByText(/secret database detail/)).toBeNull();
  });
});

describe("EmptyLedger without a button", () => {
  it("shows just the message", () => {
    render(<EmptyLedger title="Nothing here" text="Come back later." />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
