/**
 * AMK-57: Responsive Image Art Direction & Progressive Loading
 * Model interfaces for the progressive image system.
 *
 * Brand Bible compliant:
 * - Placeholder colors use only --amarka-bg (#181818) and --amarka-surface (#484848)
 * - No gold in loading states
 */

/** Configuration for a single responsive image source. */
export interface ResponsiveImageSource {
  /** Base path without extension (e.g., '/assets/images/hero-lobby'). */
  basePath: string;
  /** Alt text for accessibility. */
  alt: string;
  /** Optional LQIP (Low Quality Image Placeholder) data URI or path. */
  lqip?: string;
  /** Native width for aspect ratio calculation. */
  width: number;
  /** Native height for aspect ratio calculation. */
  height: number;
}

/** Art direction breakpoint configuration. */
export interface ArtDirectionBreakpoint {
  /** Minimum viewport width in pixels. */
  minWidth: number;
  /** Crop aspect ratio as 'width/height' string (e.g., '16/9', '4/3'). */
  aspectRatio: string;
  /** Image widths to generate in srcset. */
  widths: number[];
  /** Sizes attribute value for this breakpoint. */
  sizes: string;
}

/** Full configuration for the progressive image component. */
export interface ProgressiveImageConfig {
  /** Image source data. */
  source: ResponsiveImageSource;
  /** Art direction breakpoints (ordered desktop-first: largest minWidth first). */
  breakpoints: ArtDirectionBreakpoint[];
  /** Whether this image is above the fold (eager load + preload). */
  aboveFold: boolean;
  /** Optional CSS class for the wrapper. */
  wrapperClass?: string;
  /** Whether to show a subtle border on placeholder. Default: false. */
  showPlaceholderBorder?: boolean;
}

/** Default breakpoints per the AMK-57 spec. */
export const DEFAULT_BREAKPOINTS: ArtDirectionBreakpoint[] = [
  {
    minWidth: 1200,
    aspectRatio: '16/9',
    widths: [400, 800, 1200],
    sizes: '(min-width: 1200px) 1200px',
  },
  {
    minWidth: 768,
    aspectRatio: '16/10',
    widths: [400, 800],
    sizes: '(min-width: 768px) 800px',
  },
  {
    minWidth: 0,
    aspectRatio: '4/3',
    widths: [400, 800],
    sizes: '100vw',
  },
];

/** Default hero image config (above fold). */
export const HERO_IMAGE_DEFAULTS: Partial<ProgressiveImageConfig> = {
  aboveFold: true,
  breakpoints: DEFAULT_BREAKPOINTS,
  showPlaceholderBorder: false,
};

/** Default below-fold image config. */
export const LAZY_IMAGE_DEFAULTS: Partial<ProgressiveImageConfig> = {
  aboveFold: false,
  breakpoints: DEFAULT_BREAKPOINTS,
  showPlaceholderBorder: true,
};
