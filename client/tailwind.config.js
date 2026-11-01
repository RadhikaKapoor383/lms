/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F2E2B",
        "ink-light": "#16403B",
        parchment: "#F3EFE3",
        "parchment-dark": "#E8E2CF",
        mustard: "#D9A441",
        "mustard-dark": "#B9862F",
        clay: "#B8563F",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-work-sans)", "sans-serif"],
      },
      maxWidth: {
        prose: "70ch",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "letter-in": {
          "0%": { opacity: "0", transform: "translateY(0.5em)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "dot-pop": {
          "0%": { opacity: "0", transform: "scale(0)" },
          "60%": { opacity: "1", transform: "scale(1.6)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "line-grow": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "letter-in": "letter-in 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "dot-pop": "dot-pop 0.5s ease-out both",
        "line-grow": "line-grow 1.8s ease-in-out both",
        float: "float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
