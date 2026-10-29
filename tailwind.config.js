/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F5F0',
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F0EDE5',
          muted: '#E8E4DA',
          border: '#E3DDD3',
          borderSubtle: '#EBE7DF',
        },
        ink: {
          DEFAULT: '#111110',
          secondary: '#2E2D27',
          muted: '#504E47',
          faint: '#737066',
        },
        forest: {
          DEFAULT: '#274C3D',
          hover: '#1D3A2E',
          subtle: '#EBF2ED',
          border: '#D2E2D6',
        },
        amberState: {
          DEFAULT: '#8A5A1F',
          subtle: '#FAF2E8',
          border: '#EFE0CC',
        },
        roseState: {
          DEFAULT: '#9E2D27',
          subtle: '#FAECEB',
          border: '#F1D3D1',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '3px',
        md: '6px',
        lg: '8px',
        xl: '10px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(24, 24, 22, 0.04)',
        card: '0 1px 3px rgba(24, 24, 22, 0.05)',
        elevated: '0 4px 12px rgba(24, 24, 22, 0.08)',
      },
    },
  },
  plugins: [],
};
