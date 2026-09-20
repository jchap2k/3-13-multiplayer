/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: "#0b3d2c",
          deep: "#07281d",
          table: "#146044",
          rail: "#0e4a34",
        },
        ink: "#14201b",
      },
      fontFamily: {
        sans: [
          "Source Sans 3",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
        display: ["Fraunces", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 8px 18px rgba(0,0,0,0.28)",
      },
    },
  },
  plugins: [],
};
