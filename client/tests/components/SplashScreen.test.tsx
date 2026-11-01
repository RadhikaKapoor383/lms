import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import SplashScreen from "../../src/components/SplashScreen";

const SEEN_KEY = "ledger:splash-seen";

describe("SplashScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = "";
  });

  it("plays, then opens, then removes itself and remembers it was seen", () => {
    render(<SplashScreen />);
    const splash = screen.getByRole("status", { name: "Loading Ledger" });
    expect(splash.getAttribute("data-splash")).toBe("show");
    expect(document.body.style.overflow).toBe("hidden"); // page can't scroll behind it

    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(screen.getByRole("status").getAttribute("data-splash")).toBe("leaving");

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(sessionStorage.getItem(SEEN_KEY)).toBe("1");
    expect(document.body.style.overflow).toBe(""); // scroll restored
  });

  it("is skipped when it was already shown in this session", () => {
    sessionStorage.setItem(SEEN_KEY, "1");
    render(<SplashScreen />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("is much shorter for people who prefer reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    render(<SplashScreen />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole("status").getAttribute("data-splash")).toBe("leaving");
  });
});
