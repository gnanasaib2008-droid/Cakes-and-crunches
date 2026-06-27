/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          active: 'hsl(var(--sidebar-active))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',

        // Custom intermediate shades used throughout the app
        slate: {
          55: '#f6f7f9',
          150: '#e8ecf1',
          205: '#e0e5ec',
          250: '#d5dbe4',
          350: '#a8b5c4',
          450: '#7a8ba0',
          550: '#56667a',
          650: '#3e4e63',
          850: '#1a2536',
        },
        violet: {
          650: '#6d28d9',
          750: '#5b21b6',
          850: '#3b0d99',
        },
        amber: {
          250: '#fcd67e',
        },
        emerald: {
          250: '#6ee7b7',
          350: '#34d399',
        },
        rose: {
          350: '#fb7185',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
