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
        // #0a0b0d, #13151a) inherited from the prior cryptocurrency starter.
        //
        // This namespace CANNOT simply be deleted, for two independent reasons:
        //  1. `bitcoin-orange` / `bitcoin-gold` are persisted *data* values — they are
        //     stored on benefit templates and product benefits in Firestore and are
        //     surfaced as picker options in BENEFIT_ICON_COLORS
        //     (src/app/models/benefit-template.ts). Dropping them would break existing
        //     records, which a build-time config change cannot migrate.
        //  2. src/styles/_admin-theme.scss re-declares every `*-bitcoin-*` utility
        //     against the admin `--ts-*` theme tokens, so admin surfaces depend on
        //     these class names existing.
        // Renaming the class names is therefore a data migration, not a config edit.
        bitcoin: {
          orange: '#906030',  // → --amarka-gold
          gold: '#906030',    // → --amarka-gold
          'dark': '#181818',  // → --amarka-bg
          'gray': '#484848',  // → --amarka-surface
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
      },
      // Tailwind Preflight applies `border-color: #e5e7eb` (gray-200) to *every*
      // element, so any `border` utility without an explicit colour painted an
      // off-palette grey. On the home page alone that was the most-painted
      // colour in the document. Default to the Brand Bible surface instead.
      borderColor: {
        DEFAULT: '#484848',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
        pill: 'var(--radius-full)'
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
