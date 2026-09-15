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
    },
  },
  plugins: [],
};
