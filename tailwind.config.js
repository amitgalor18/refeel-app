/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- Add this
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#1E2630',
          secondary: '#283240',
          input: '#334155',
        },
        text: {
          primary: '#F1F5F9',
        },
        accent: {
          blue: '#60A5FA',
        },
        border: {
          subtle: '#475569',
        },
        success: '#4ADE80',
        error: '#F87171',
      },
    },
  },
  plugins: [],
}