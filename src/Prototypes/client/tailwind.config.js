/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'soft-blue': {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b8deff',
          300: '#7ac5ff',
          400: '#33a8ff',
          500: '#0a8fff',
          600: '#0070e6',
          700: '#0058b8',
          800: '#054a96',
          900: '#0a3f7a',
        },
        'cream': {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#faf2e1',
          300: '#f5e6c8',
          400: '#eed3a5',
          500: '#e4c08a',
          600: '#d4a86f',
          700: '#b88a4f',
          800: '#987043',
          900: '#7d5d3a',
        },
        'beige': {
          50: '#faf9f7',
          100: '#f5f3f0',
          200: '#eae6df',
          300: '#ddd6ca',
          400: '#c9bfad',
          500: '#b5a890',
          600: '#9d8f75',
          700: '#827560',
          800: '#6b6050',
          900: '#574f43',
        },
      },
      fontFamily: {
        'serif': ['Georgia', 'Times New Roman', 'serif'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      boxShadow: {
        'hard': '4px 4px 0px 0px #000000',
        'hard-sm': '2px 2px 0px 0px #000000',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

