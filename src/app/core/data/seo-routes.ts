/** Metadata for the public routes. Retired URLs are HTTP redirects, not pages. */
export interface RouteSeoConfig {
  readonly title: string;
  readonly description: string;
  readonly keywords?: string;
  readonly ogImage?: string;
  readonly jsonLd?: Record<string, unknown> | readonly Record<string, unknown>[];
}

export const BASE_URL = 'https://amarka.co';
export const BASE_OG_IMAGE = `${BASE_URL}/amarka-logo-transparent.png`;

export const ROUTE_SEO: Readonly<Record<string, RouteSeoConfig>> = {
  '': {
    title: 'Custom Engraving & Branded Merch in South Florida | Amarka',
    description: 'Custom merchandise, engraving, branded apparel and corporate gifts for businesses in Miami and South Florida.',
    keywords: 'corporate merchandise Miami, custom engraving South Florida, branded apparel, corporate gifts'
  },
  enquire: {
    title: 'Get a Quote | Amarka South Florida',
    description: 'Tell Amarka about your merchandise, engraving or corporate gift project. Share quantities, artwork and delivery needs to request a quote.'
  },
  design: {
    title: 'Product Customization Studio | Amarka',
    description: 'Explore a custom product design with Amarka, add your artwork and share your concept for a project quote.'
  },
  'privacy-policy': {
    title: 'Privacy Policy | Amarka',
    description: 'How Amarka collects, uses and protects personal information when you visit our website or enquire about a project.'
  },
  'cookie-policy': {
    title: 'Cookie Policy | Amarka',
    description: 'Learn how Amarka uses cookies and how to manage your cookie preferences.'
  },
  terms: {
    title: 'Terms | Amarka',
    description: 'Read the terms governing use of the Amarka website and our services.'
  }
};

export function normalizeSeoPath(url: string): string {
  return url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
}
