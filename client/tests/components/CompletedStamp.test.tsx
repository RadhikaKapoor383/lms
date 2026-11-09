import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CompletedStamp from "../../src/components/ledger/CompletedStamp";
import CertificateSeal from "../../src/components/ledger/CertificateSeal";
import StampFilter from "../../src/components/ledger/StampFilter";

describe("CompletedStamp", () => {
  it("still says Completed in words, so it reads the same for screen readers and searches", () => {
    render(<CompletedStamp />);
    expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("can show a date under the word", () => {
    render(<CompletedStamp size="md" date="29 OCT 2026" />);
    expect(screen.getByText("29 OCT 2026")).toBeTruthy();
  });
});

describe("CertificateSeal", () => {
  it("is an image with a label", () => {
    render(<CertificateSeal />);
    expect(screen.getByRole("img", { name: "Ledger certified seal" })).toBeTruthy();
  });
});

describe("StampFilter", () => {
  it("is hidden from assistive technology and defines the ink filter", () => {
    const { container } = render(<StampFilter />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("filter#ink-rough")).toBeTruthy();
  });
});
