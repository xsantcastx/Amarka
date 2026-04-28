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
        // Legacy `bitcoin.*` namespace — REMAPPED to Brand Bible 6-token palette
        // (AMK-80 alias migration). Was Bitcoin-template residue (#f7931a, #ffb81c,
        // #0a0b0d, #13151a) inherited from the prior cryptocurrency starter. Existing
        // class consumers (`bg-bitcoin-orange`, `text-bitcoin-gold`, etc.) continue to
        // compile and now render Amarka palette colors. Future tasks should migrate
        // class names to `amarka-*` and remove this namespace entirely.
        bitcoin: {
          orange: '#906030',  // → --amarka-gold
          gold: '#906030',    // → --amarka-gold
          'dark': '#181818',  // → --amarka-bg
          'gray': '#484848',  // → --amarka-surface
        },
        // Legacy `luxury.*` namespace — REMAPPED to Brand Bible tokens (AMK-80).
        // Not actively used as Tailwind classes (only via CSS custom properties),
        // kept here for completeness so any stray reference resolves on-brand.
        luxury: {
          gold: '#906030',    // → --amarka-gold (was #d4af37)
          silver: '#c0c0c0',  // = --amarka-text-secondary (already on-palette)
          bronze: '#906030',  // → --amarka-gold (was #cd7f32)
        },
        // Amarka Brand Palette v1
        'amarka-bg': '#181818',          // Primary background
        'amarka-surface': '#484848',     // Cards, panels, modals
        'amarka-gold': '#906030',        // Brand accent — large text & borders only
        'amarka-text': '#f0f0f0',        // Primary text (16.16:1 on bg)
        'amarka-text-secondary': '#c0c0c0', // Secondary text (10.08:1 on bg)
        'amarka-text-muted': '#909090',  // Captions, placeholders (5.73:1 on bg)
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
        // AMK-80: rgba(247,147,26) (Bitcoin orange) → rgba(144,96,48) (--amarka-gold)
        bitcoin: '0 0 20px rgba(144, 96, 48, 0.3), 0 0 40px rgba(144, 96, 48, 0.2)',
        'bitcoin-lg': '0 0 30px rgba(144, 96, 48, 0.4), 0 0 60px rgba(144, 96, 48, 0.3)',
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
        // AMK-80: Bitcoin/cryptocurrency gradient (#f7931a → #ffb81c → #d4af37) and
        // dark gradient (#0a0b0d → #13151a → #1a1d24) collapsed to Brand Bible palette.
        // Kept as legacy aliases so consumers (`bg-bitcoin-gradient`, `bg-dark-gradient`)
        // continue rendering, now in approved Amarka tokens.
        'bitcoin-gradient': 'linear-gradient(135deg, #906030 0%, #906030 50%, #906030 100%)',
        'dark-gradient': 'linear-gradient(135deg, #181818 0%, #181818 50%, #181818 100%)',
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
