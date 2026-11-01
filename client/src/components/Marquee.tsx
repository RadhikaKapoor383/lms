// A slow, endlessly scrolling strip of what every course includes.
// Two identical copies side by side + translateX(-50%) = a seamless loop.
// Decorative only, so it's hidden from screen readers; pauses on hover.
const items = [
  "Lessons",
  "Quizzes",
  "Assignments",
  "Discussions",
  "Progress tracking",
  "Certificates",
];

export default function Marquee() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden border-b border-parchment-dark py-5 dark:border-ink-light"
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center font-display text-xl text-ink/70 dark:text-parchment/70"
              >
                <span className="px-8">{item}</span>
                <span className="h-1.5 w-1.5 rotate-45 bg-mustard" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
