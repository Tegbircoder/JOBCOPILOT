/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        accent: "#2563eb",
        accentDark: "#1e40af",
        accentLight: "#60a5fa",
      },
      boxShadow: {
        card: "0 10px 30px rgba(2,6,23,.08)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
