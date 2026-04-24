/**
 * AMK-9 — Per-route SEO configuration.
 *
 * Owner: xsantcastx (Amarka — Stamford, CT laser engraving studio)
 * Shipped: 2026-04-24 by amarka-backlog-executor-v2 scheduled agent.
 *
 * Brand Bible compliance:
 *   - Stamford CT positioning — zero Miami / NYC references
 *   - Contacts: diego@amarka.co, jessica@amarka.co
 *   - Audience: interior designers, GCs, hospitality, corporate, makers/studios
 *
 * Source of truth:
 *   - Base canonical URL: https://amarka.co
 *   - Base OG/Twitter image: /Logo%20Clear2.png (already linked from index.html)
 *   - Default title template is owned by PageTitleStrategy + app.routes.ts.
 *     This config only controls description, keywords, OG/Twitter override,
 *     canonical, and JSON-LD payloads.
 */

export interface RouteSeoConfig {
  /** Human-readable page title (override if different from router title). */
  readonly title?: string;
  /** Meta description (<= 160 chars). */
  readonly description: string;
  /** Meta keywords (comma-separated). */
  readonly keywords?: string;
  /** Override og:image (falls back to base image otherwise). */
  readonly ogImage?: string;
  /** Structured data payload(s) to inject as application/ld+json. */
  readonly jsonLd?: Record<string, unknown> | readonly Record<string, unknown>[];
}

export const BASE_URL = 'https://amarka.co';
export const BASE_OG_IMAGE = `${BASE_URL}/Logo%20Clear2.png`;

/**
 * LocalBusiness JSON-LD block — injected on every page.
 * Uses the ProfessionalService subtype because Amarka is a trade-facing
 * engraving studio, not a consumer storefront.
 */
export const LOCAL_BUSINESS_JSONLD: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Amarka',
  alternateName: 'Amarka Laser Engraving',
  description:
    'Bespoke laser engraving studio in Stamford, CT serving interior designers, GCs, hospitality groups, and corporate operators across Connecticut and the tri-state region.',
  url: BASE_URL,
  logo: `${BASE_URL}/Logo%20Clear.png`,
  image: BASE_OG_IMAGE,
  telephone: '',
  email: 'diego@amarka.co',
  priceRange: '$$-$$$',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Stamford',
    addressRegion: 'CT',
    addressCountry: 'US'
  },
  areaServed: [
    { '@type': 'State', name: 'Connecticut' },
    { '@type': 'State', name: 'New York' },
    { '@type': 'State', name: 'New Jersey' },
    { '@type': 'AdministrativeArea', name: 'Tri-State Region' }
  ],
  serviceType: [
    'Laser Engraving',
    'Custom Signage',
    'FF&E Engraving',
    'Architectural Engraving',
    'Bar & Hospitality Signage',
    'Corporate Signage'
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '17:00'
    }
  ]
};

/**
 * Route-to-SEO lookup. Keys are router paths (no leading slash for root).
 * Dynamic routes (services/:slug) are handled in seo.service with a fallback.
 */
export const ROUTE_SEO: Readonly<Record<string, RouteSeoConfig>> = {
  '': {
    title: 'Amarka | Bespoke Laser Engraving — Stamford, CT for the Trade',
    description:
      'Amarka is the Stamford, CT laser engraving studio for interior designers, GCs, hospitality groups, and corporate operators across Connecticut and the tri-state region. 5–10 day turnaround.',
    keywords:
      'laser engraving Stamford CT, custom signage Connecticut trade, bespoke engraved signage, FF&E laser engraving, trade engraving supplier Connecticut'
  },
  work: {
    title: 'Our Work | Amarka',
    description:
      'Selected laser engraving projects from Amarka — hospitality, corporate, retail, and residential installations across Connecticut and the tri-state region.',
    keywords:
      'laser engraving portfolio Connecticut, engraved signage case studies, hospitality engraving projects, trade engraving work'
  },
  services: {
    title: 'Services | Amarka',
    description:
      'Laser engraving services for the trade — FF&E engraving, custom signage, architectural plaques, bar & hospitality signage, and corporate installations.',
    keywords:
      'laser engraving services, FF&E engraving, custom signage services, architectural plaques Connecticut, hospitality signage trade'
  },
  trade: {
    title: 'Trade Programme | Amarka',
    description:
      'Amarka Trade Programme — priority production, spec-sheet intake, and predictable 5–10 day turnaround for interior designers, GCs, and hospitality operators.',
    keywords:
      'laser engraving trade programme Connecticut, designer engraving supplier, GC signage trade account, hospitality engraving partner'
  },
  clients: {
    title: 'Who We Work With | Amarka',
    description:
      'Amarka partners with interior designers, general contractors, hospitality groups, corporate operators, and maker studios across Connecticut and the tri-state region.',
    keywords:
      'engraving for interior designers, engraving for general contractors, hospitality engraving partner, corporate signage vendor Connecticut'
  },
  enquire: {
    title: 'Start a Commission | Amarka',
    description:
      'Send Amarka your project specs and receive a production estimate. Spec-sheet intake for FF&E, signage, and architectural engraving commissions — Stamford, CT.',
    keywords:
      'laser engraving quote Connecticut, commission engraving Stamford CT, custom signage estimate, FF&E engraving enquiry'
  },
  materials: {
    title: 'Materials & Finishes | Amarka',
    description:
      'Six substrates, trade-tested: brass, stainless steel, anodized aluminum, walnut, acrylic, and leather — engraved to architectural and hospitality spec.',
    keywords:
      'laser engraving materials, brass engraving, stainless steel engraving, anodized aluminum engraving, walnut engraving, acrylic engraving Connecticut'
  },
  about: {
    title: 'About the Studio | Amarka',
    description:
      'Amarka is a Stamford, CT laser engraving studio built for the trade — precise substrates, predictable turnaround, and spec-fluent production.',
    keywords:
      'about Amarka, Stamford CT engraving studio, trade engraving Connecticut, laser engraving studio tri-state'
  },
  tools: {
    title: 'Tools & Specifications | Amarka',
    description:
      'Downloadable spec sheets, substrate guides, and engraving tolerances for designers and specifiers working with Amarka in Stamford, CT.',
    keywords:
      'laser engraving spec sheets, engraving tolerances, substrate guide Connecticut, trade engraving documentation'
  }
};

/**
 * Per-vertical Service schema for /services/:slug pages.
 * Slug keys match the vertical slugs consumed by ServiceVerticalPageComponent.
 */
export const SERVICE_VERTICAL_SEO: Readonly<Record<string, RouteSeoConfig>> = {
  'interior-designers': {
    title: 'Laser Engraving for Interior Designers | Amarka',
    description:
      'Spec-fluent FF&E and signage engraving for interior designers — brass, walnut, acrylic, leather. Stamford, CT studio serving Connecticut and the tri-state region.',
    keywords:
      'laser engraving for interior designers, FF&E engraving Connecticut, designer spec engraving, trade engraving supplier interior designers'
  },
  'general-contractors': {
    title: 'Architectural Engraving for General Contractors | Amarka',
    description:
      'Architectural plaques, wayfinding, and dedication signage engraved on trade-tested substrates. Amarka — Stamford, CT for the Connecticut construction trade.',
    keywords:
      'architectural engraving general contractors, dedication plaques Connecticut, wayfinding engraving, GC signage vendor'
  },
  'hospitality': {
    title: 'Hospitality Signage & Engraving | Amarka',
    description:
      'Bar, restaurant, and hotel signage engraved on brass, stainless, and walnut — trade turnaround from the Amarka studio in Stamford, CT.',
    keywords:
      'hospitality engraving, bar signage Connecticut, restaurant signage engraving, hotel plaques, hospitality trade engraving'
  },
  'corporate': {
    title: 'Corporate Signage & Engraving | Amarka',
    description:
      'Lobby plaques, award dedications, and corporate wayfinding engraved to architectural spec. Amarka — Stamford, CT for Connecticut corporate operators.',
    keywords:
      'corporate engraving Connecticut, lobby plaques, corporate signage Stamford CT, award engraving trade'
  }
};
