/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        streettrade: {
          ink: "#0f172a",
          accent: "#0ea5e9",
          mint: "#16a34a",
          steel: "#2563eb"
        }
      }
    }
  },
  plugins: []
};
