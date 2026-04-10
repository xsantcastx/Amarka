/**
 * AMK-63: Scroll-Aware Smart Sticky Navigation
 * Model & configuration interfaces
 */

/** Configuration for the sticky nav scroll behavior */
export interface StickyNavConfig {
  /** Scroll threshold in pixels before transitioning to compact state */
  scrollThreshold: number;
  /** Whether to use compact state by default on mobile (<768px) */
  compactOnMobile: boolean;
  /** Mobile breakpoint in pixels */
  mobileBreakpoint: number;
}

/** Default configuration matching the AMK-63 spec */
export const DEFAULT_STICKY_NAV_CONFIG: StickyNavConfig = {
  scrollThreshold: 80,
  compactOnMobile: true,
  mobileBreakpoint: 768,
};
