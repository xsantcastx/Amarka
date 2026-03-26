/**
 * Amarka Design System — Color Tokens
 * WCAG AA compliant usage rules documented inline.
 */
export const AmarkaColors = {
  // Backgrounds
  bg: '#181818',
  surface: '#484848',

  // Text
  text: '#f0f0f0',          // ✅ Use anywhere on bg/surface
  textSecondary: '#c0c0c0', // ✅ Use anywhere on bg/surface
  textMuted: '#909090',     // ✅ On bg | ⚠️ Large text only on surface

  // Accent
  gold: '#906030',

  // WCAG contrast ratios (against backgrounds)
  contrastRatios: {
    textOnBg: 16.16,          // #f0f0f0 on #181818
    textSecondaryOnBg: 10.08,
    textMutedOnBg: 5.73,
    goldOnBg: 3.29,           // Large text only (≥18px)
    textOnSurface: 8.56,
    textSecondaryOnSurface: 5.1,
    textMutedOnSurface: 3.04, // Large text only
    goldOnSurface: 1.74,      // ❌ NEVER use
    textOnGold: 4.92,         // White text on gold buttons ✅
  },

  /**
   * Safe text color for a given background
   * Returns the appropriate text color given a bg context
   */
  safeTextFor: {
    bg: '#f0f0f0',
    surface: '#f0f0f0',
    gold: '#f0f0f0',
  },
} as const;

export type AmarkaColorKey = keyof typeof AmarkaColors;
