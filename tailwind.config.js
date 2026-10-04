/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aksana: {
          primary: '#1e293b',
          accent: '#2563eb',
        },
      },
    },
  },
  plugins: [],
}
