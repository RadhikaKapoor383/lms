import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const api = vi.hoisted(() => ({ announcements: [] as any[] }));
vi.mock("@/redux/features/announcements/announcementsApi", () => ({
  useGetAnnouncementsQuery: () => ({ data: { announcements: api.announcements } }),
}));

import AnnouncementBar from "../../src/components/AnnouncementBar";

const KEY = "ledger:dismissed-announcement";
const maintenance = { _id: "a1", title: "Scheduled maintenance", message: "Sunday night." };

describe("AnnouncementBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    api.announcements = [maintenance];
  });
  afterEach(() => vi.useRealTimers());

  it("shows the latest platform announcement", () => {
    render(<AnnouncementBar />);
    expect(screen.getByText(/Scheduled maintenance:/)).toBeTruthy();
    expect(screen.getByText(/Sunday night\./)).toBeTruthy();
  });

  it("closes with the x, remembers it, and stays closed on the next visit", () => {
    const { unmount } = render(<AnnouncementBar />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss announcement" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText(/Scheduled maintenance:/)).toBeNull();
    expect(localStorage.getItem(KEY)).toBe("a1");

    unmount();
    render(<AnnouncementBar />); // a fresh visit
    expect(screen.queryByText(/Scheduled maintenance:/)).toBeNull();
  });

  it("shows again when a newer announcement is posted", () => {
    localStorage.setItem(KEY, "a1");
    api.announcements = [{ _id: "a2", title: "New: certificates", message: "Earn one." }, maintenance];
    render(<AnnouncementBar />);
    expect(screen.getByText(/New: certificates:/)).toBeTruthy();
  });

  it("never shows an announcement that belongs to a course", () => {
    api.announcements = [{ _id: "c1", title: "Office hours", message: "Thursday.", course: "course-1" }];
    render(<AnnouncementBar />);
    expect(screen.queryByText(/Office hours/)).toBeNull();
  });
});
