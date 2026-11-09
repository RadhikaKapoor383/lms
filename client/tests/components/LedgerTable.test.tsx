import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import LedgerTable from "../../src/components/ledger/LedgerTable";
import EmptyLedger from "../../src/components/ledger/EmptyLedger";
import type { LedgerEntry } from "../../src/types/ledger";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();
const entries: LedgerEntry[] = [
  { kind: "quiz", at: local(2026, 11, 4), title: "Check your understanding", courseName: "Web basics", detail: "8 / 10", counts: true, total: 14 },
  { kind: "lesson", at: local(2026, 11, 3), title: "Your first small project", courseName: "Web basics", counts: true, total: 13 },
  { kind: "certificate", at: local(2026, 10, 29), title: "JavaScript from Scratch", courseName: "JavaScript from Scratch", certificateId: "cert-1", counts: false, total: 12 },
  { kind: "lesson", at: local(2026, 10, 28), title: "Final project walkthrough", courseName: "JavaScript", counts: true, total: 12 },
];

describe("LedgerTable", () => {
  it("groups entries by month and shows each running total", () => {
    render(<LedgerTable entries={entries} totalEntries={4} />);
    expect(screen.getByRole("heading", { name: "NOVEMBER 2026" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "OCTOBER 2026" })).toBeTruthy();
    expect(screen.getByLabelText("total 14")).toBeTruthy();
    expect(screen.getByText("8 / 10")).toBeTruthy();
  });

  it("gives a finished month a subtotal of the entries that add to the total", () => {
    render(<LedgerTable entries={entries} totalEntries={4} />);
    // November: a quiz and a lesson = +2. October: a lesson and a certificate (does not count) = +1
    expect(screen.getByText("NOVEMBER TOTAL").parentElement?.textContent).toContain("+2");
    expect(screen.getByText("OCTOBER TOTAL").parentElement?.textContent).toContain("+1");
  });

  it("links a certificate entry to its public page", () => {
    render(<LedgerTable entries={entries} totalEntries={4} />);
    const link = screen.getByRole("link", { name: "JavaScript from Scratch" });
    expect(link.getAttribute("href")).toBe("/certificates/cert-1");
  });

  it("while earlier entries are hidden, the oldest month has no subtotal, and 'show earlier' works", () => {
    const onShowMore = vi.fn();
    render(<LedgerTable entries={entries} totalEntries={9} onShowMore={onShowMore} />);
    expect(screen.getByText("NOVEMBER TOTAL")).toBeTruthy();
    expect(screen.queryByText("OCTOBER TOTAL")).toBeNull(); // may still be filling up
    fireEvent.click(screen.getByRole("button", { name: /Show earlier entries \(5\)/ }));
    expect(onShowMore).toHaveBeenCalledTimes(1);
  });

  it("has no 'show earlier' button when everything is on screen", () => {
    render(<LedgerTable entries={entries} totalEntries={4} onShowMore={() => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("lists the entries in order inside the section", () => {
    render(<LedgerTable entries={entries} totalEntries={4} />);
    const section = screen.getByRole("region", { name: "Your ledger" });
    expect(within(section).getAllByRole("listitem")).toHaveLength(4);
  });
});

describe("EmptyLedger", () => {
  it("shows the message and a link to browse courses", () => {
    render(<EmptyLedger text="Finish your first lesson." ctaLabel="Browse courses" ctaHref="/courses" />);
    expect(screen.getByRole("heading", { name: "No entries yet" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Browse courses" }).getAttribute("href")).toBe("/courses");
  });
});
