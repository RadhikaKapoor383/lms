import type { Metadata } from "next";

// The reset token is in this page's address. Don't send it along as a Referer
// to anything the page links to, and keep the page out of search results.
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
