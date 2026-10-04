"use client";

// Read-only stars when `onChange` is omitted, a clickable picker when given.
export default function StarRating({
  value,
  onChange,
  size = "text-lg",
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: string;
}) {
  const rounded = Math.round(value);
  return (
    <span className={`inline-flex ${size}`} role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rounded;
        const glyph = (
          <span className={filled ? "text-mustard" : "text-ink/20 dark:text-parchment/20"}>★</span>
        );
        return onChange ? (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === rounded}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange(star)}
            className="px-0.5 hover:scale-110"
          >
            {glyph}
          </button>
        ) : (
          <span key={star}>{glyph}</span>
        );
      })}
    </span>
  );
}
