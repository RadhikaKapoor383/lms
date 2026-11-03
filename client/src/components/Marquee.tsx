// A slow, endlessly scrolling strip of what every course includes.
// Two identical copies side by side + translateX(-50%) = a seamless loop.
// Decorative only, so it's hidden from screen readers; pauses on hover.
const items = [
  { label: "Lessons", icon: <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" /> },
  {
    label: "Quizzes",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
      </>
    ),
  },
  {
    label: "Assignments",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </>
    ),
  },
  { label: "Discussions", icon: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z" /> },
  {
    label: "Progress tracking",
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </>
    ),
  },
  {
    label: "Certificates",
    icon: (
      <>
        <circle cx="12" cy="8" r="6" />
        <path d="M8.2 13.9 7 23l5-3 5 3-1.2-9.1" />
      </>
    ),
  },
];

export default function Marquee() {
  return (
    <div
      aria-hidden="true"
      // the edges fade out so chips glide in and out instead of being cut off
      className="overflow-hidden border-b border-parchment-dark py-6 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] dark:border-ink-light"
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 gap-4 pr-4">
            {items.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2.5 rounded-full border border-ink/10 bg-white/50 px-5 py-2.5 text-sm font-medium text-ink/80 dark:border-parchment/15 dark:bg-ink-light/40 dark:text-parchment/80"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-mustard-dark dark:text-mustard"
                >
                  {item.icon}
                </svg>
                {item.label}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
