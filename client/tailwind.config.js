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
        "letter-rise": {
          "0%": { transform: "translateY(110%)" },
          "100%": { transform: "translateY(0)" },
        },
        "line-grow-y": {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
        tick: {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "letter-in": "letter-in 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "dot-pop": "dot-pop 0.5s ease-out both",
        "line-grow": "line-grow 1.8s ease-in-out both",
        float: "float 7s ease-in-out infinite",
        "letter-rise": "letter-rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "line-grow-y": "line-grow-y 1.6s ease-in-out both",
        tick: "tick 0.5s ease-out both",
        shake: "shake 0.4s ease-in-out",
        marquee: "marquee 35s linear infinite",
      },
    },
  },
  plugins: [],
};
