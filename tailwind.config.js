/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        mist: "#eef8f8",
        sea: "#cfeeed",
        cream: "#fffdf7",
      },
      boxShadow: {
        soft: "0 18px 60px rgba(34, 75, 89, 0.12)",
      },
      borderRadius: {
        card: "26px",
      },
    },
  },
  plugins: [],
};
