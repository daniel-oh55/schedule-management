/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        line: "#cbd5e1",
        harbor: "#0f766e",
        port: "#2563eb",
        paper: "#f8fafc",
      },
      boxShadow: {
        grid: "0 1px 2px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
