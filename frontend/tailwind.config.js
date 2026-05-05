/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GitHub-inspired palette for dark mode
        bg: {
          DEFAULT: '#0d1117',
          card: '#161b22',
          elevated: '#21262d',
        },
        border: {
          DEFAULT: '#30363d',
          muted: '#21262d',
        },
        accent: {
          DEFAULT: '#2f81f7',
          green: '#3fb950',
          orange: '#d29922',
          red: '#f85149',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
