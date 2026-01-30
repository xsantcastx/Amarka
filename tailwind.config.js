/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        neutral: "rgb(var(--color-neutral) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        background: "rgb(var(--color-background) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
        ts: {
          bg: "var(--ts-bg)",
          'bg-soft': "var(--ts-bg-soft)",
          ink: "var(--ts-ink)",
          'ink-soft': "var(--ts-ink-soft)",
          accent: "var(--ts-accent)",
          line: "var(--ts-line)",
          paper: "var(--ts-paper)"
        },
        bitcoin: {
          orange: '#f7931a',
          gold: '#ffb81c',
          'dark': '#0a0b0d',
          'gray': '#13151a',
        },
        luxury: {
          gold: '#d4af37',
          silver: '#c0c0c0',
          bronze: '#cd7f32',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', '"Cormorant Garamond"', 'ui-serif', 'serif'],
        sans: ['"Source Sans 3"', '"Inter"', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        lvl0: 'var(--shadow-0)',
        lvl1: 'var(--shadow-1)',
        lvl2: 'var(--shadow-2)',
        lvl3: 'var(--shadow-3)',
        lvl4: 'var(--shadow-4)',
        soft: '0 10px 30px -12px rgba(0,0,0,.35)',
        bitcoin: '0 0 20px rgba(247, 147, 26, 0.3), 0 0 40px rgba(247, 147, 26, 0.2)',
        'bitcoin-lg': '0 0 30px rgba(247, 147, 26, 0.4), 0 0 60px rgba(247, 147, 26, 0.3)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
        pill: 'var(--radius-full)'
      },
      backgroundImage: {
        'bitcoin-gradient': 'linear-gradient(135deg, #f7931a 0%, #ffb81c 50%, #d4af37 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0a0b0d 0%, #13151a 50%, #1a1d24 100%)',
      },
      fontSize: {
        base: 'var(--font-size-base)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)'
      }
    },
  },
  plugins: [],
}
