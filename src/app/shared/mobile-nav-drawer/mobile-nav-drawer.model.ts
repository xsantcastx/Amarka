/**
 * AMK-65: Mobile Trade-Optimized Navigation Drawer
 * Data models for the mobile navigation drawer component.
 */

export interface NavLink {
  label: string;
  route: string;
  /** Whether this link is the currently active page */
  active?: boolean;
}

export interface MobileNavConfig {
  /** Navigation links to display in the drawer */
  links: NavLink[];
  /** CTA buttons at the bottom of the drawer (Zone 3b outlined style) */
  ctaButtons: NavCtaButton[];
  /** Stagger delay in ms between nav link entrance animations */
  staggerDelayMs: number;
  /** Open animation duration in ms */
  openDurationMs: number;
  /** Close animation duration in ms */
  closeDurationMs: number;
}

export interface NavCtaButton {
  label: string;
  route: string;
}

/** Default navigation configuration matching Amarka site structure */
export const AMARKA_NAV_CONFIG: MobileNavConfig = {
  links: [
    { label: 'Home', route: '/' },
    { label: 'Services', route: '/services' },
    { label: 'Portfolio', route: '/portfolio' },
    { label: 'About', route: '/about' },
    { label: 'Contact', route: '/contact' },
  ],
  ctaButtons: [
    { label: 'Get a Quote', route: '/enquire' },
    { label: 'Start a Commission', route: '/enquire' },
  ],
  staggerDelayMs: 40,
  openDurationMs: 300,
  closeDurationMs: 250,
};
