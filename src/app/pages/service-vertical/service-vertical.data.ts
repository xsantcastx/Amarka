/**
 * AMK-58 — Vertical-specific SEO landing pages
 *
 * Brand Bible compliance:
 *   - Stamford, CT positioning — zero NYC references
 *   - Products from approved catalog only (wayfinding, donor walls, architectural panels,
 *     custom awards, hospitality signage, etc.)
 *   - Substrates: brass, aluminium, stainless steel, acrylic, hardwood, glass (6 only)
 *   - Voice: professional, precise, trade-fluent, confident
 *
 * Each vertical landing page targets a long-tail keyword cluster that the homepage
 * cannot rank for on its own. Together with /services they expand crawlable surface
 * area for trade-relevant search intent.
 */

export interface VerticalCTA {
  label: string;
  href: string;
  variant: 'primary' | 'ghost';
}

export interface VerticalProduct {
  name: string;
  substrate: string;
}

export interface VerticalSection {
  heading: string;
  body: string;
}

export interface VerticalLandingContent {
  slug: string;
  routeTitle: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  badge: string;
  heroHeading: string;
  heroSubheading: string;
  sections: VerticalSection[];
  products: VerticalProduct[];
  substrates: string[];
  ctaHeading: string;
  ctaSubheading: string;
  ctas: VerticalCTA[];
  serviceJsonLdName: string;
  serviceJsonLdDescription: string;
}

const SHARED_SUBSTRATES = ['Brass', 'Aluminium', 'Stainless Steel', 'Acrylic', 'Hardwood', 'Glass'];

const SHARED_CTAS: VerticalCTA[] = [
  { label: 'Request a Quote', href: '/enquire', variant: 'primary' },
  { label: 'View Our Work', href: '/work', variant: 'ghost' }
];

export const SERVICE_VERTICALS: VerticalLandingContent[] = [
  {
    slug: 'hospitality',
    routeTitle: 'Hospitality Signage & Guest Experience Engraving',
    seoTitle: 'Hospitality Signage & Wayfinding Engraving | Stamford CT | Amarka',
    seoDescription:
      'Custom engraved hospitality signage, wayfinding, room numbers, and guest-experience details for hotels, resorts, and boutique properties across Connecticut and the tri-state region.',
    seoKeywords: [
      'hospitality signage Connecticut',
      'hotel wayfinding engraving Stamford CT',
      'engraved room numbers hospitality',
      'boutique hotel signage Connecticut',
      'resort signage trade supplier',
      'guest experience engraving Stamford',
      'hospitality FF&E laser engraving',
      'custom hotel plaques Connecticut'
    ],
    badge: 'Hospitality',
    heroHeading: 'Engraved hospitality signage for properties that sweat the details.',
    heroSubheading:
      'Wayfinding, room numbers, donor walls, and back-of-house identification produced in Stamford, CT for hotels, resorts, and boutique properties throughout Connecticut and the tri-state region.',
    sections: [
      {
        heading: 'Designed to brief, finished to spec',
        body:
          'We work directly from your design package — supplied artwork, brand standards, mounting drawings — and translate it into engraved deliverables that survive a ten-year property cycle. No catalogue substitutions, no rounded specs.'
      },
      {
        heading: 'Materials matched to the property',
        body:
          'Brass and brushed stainless for heritage interiors. Powder-coated aluminium and acrylic for contemporary fit-outs. Hardwood inlays for residential-style boutique programmes. Substrate selection is reviewed against installation environment, not house preference.'
      },
      {
        heading: 'Trade lead times you can hold',
        body:
          'Standard turnaround is five to ten business days from approved artwork. Rush programmes ship in seventy-two hours when the property calendar requires it. Lead times are quoted before commitment, not after.'
      },
      {
        heading: 'A single point of contact',
        body:
          'Every commission is managed by a member of the Amarka studio. Diego or Jessica responds to scope and pricing questions; production runs in-house under the same roof. No third-party fulfilment, no untracked sub-vendors.'
      }
    ],
    products: [
      { name: 'Wayfinding signage', substrate: 'Brass' },
      { name: 'Room numbers & door plates', substrate: 'Brass' },
      { name: 'Donor & dedication walls', substrate: 'Brass' },
      { name: 'Architectural panels', substrate: 'Stainless Steel' },
      { name: 'Concierge & lobby signage', substrate: 'Hardwood' },
      { name: 'Back-of-house identification', substrate: 'Aluminium' },
      { name: 'Spa & amenity signage', substrate: 'Acrylic' },
      { name: 'Custom plaques & dedications', substrate: 'Brass' }
    ],
    substrates: SHARED_SUBSTRATES,
    ctaHeading: 'Specifying a hospitality programme?',
    ctaSubheading:
      'Send the package. We respond within one business day with substrate recommendations, lead times, and a written quote.',
    ctas: SHARED_CTAS,
    serviceJsonLdName: 'Hospitality Signage & Wayfinding Engraving',
    serviceJsonLdDescription:
      'Custom engraved hospitality signage, wayfinding, room numbers, donor walls, and guest-experience details for hotels, resorts, and boutique properties across Connecticut and the tri-state region.'
  },
  {
    slug: 'bar-restaurant',
    routeTitle: 'Bar & Restaurant Engraving — Drinkware, Signage, Hospitality Branding',
    seoTitle: 'Bar & Restaurant Engraving | Drinkware & Signage | Stamford CT | Amarka',
    seoDescription:
      'Engraved drinkware, bar signage, branded barware, and hospitality identification for restaurants, bars, and F&B groups across Connecticut. Trade pricing, in-house production, Stamford CT.',
    seoKeywords: [
      'restaurant signage engraving Connecticut',
      'bar drinkware engraving Stamford CT',
      'branded barware Connecticut',
      'F&B engraving trade supplier',
      'hospitality bar signage',
      'engraved cocktail menus',
      'custom bar plaques Connecticut',
      'restaurant brand engraving Stamford'
    ],
    badge: 'Bar & Restaurant',
    heroHeading: 'Engraved bar service and restaurant identity, finished in-house.',
    heroSubheading:
      'Branded drinkware, engraved bar signage, cocktail menu boards, and front-of-house identification produced in Stamford, CT for hospitality groups across Connecticut.',
    sections: [
      {
        heading: 'Production on a hospitality calendar',
        body:
          'Restaurant and bar programmes ship around opening dates, menu launches, and brand refreshes. We work to those dates — not to a generic backlog. Standard turnaround is five to ten business days; rush windows hold at seventy-two hours.'
      },
      {
        heading: 'Substrates for service environments',
        body:
          'Stainless steel for back-bar identification that endures water, sanitiser, and constant handling. Brass and powder-coated aluminium for front-of-house brand expression. Hardwood for tabletop and reserved signage. Substrate selection is matched to wear, not to display.'
      },
      {
        heading: 'Brand standards held exactly',
        body:
          'We work from supplied artwork, brand colours, and approved typography. House marks, sub-brands, and concept identities are reproduced to specification — no substitutions, no rounded edges, no creative liberties without written approval.'
      },
      {
        heading: 'Volumes that match the floor',
        body:
          'Single-property runs through multi-location rollouts. Each commission is quoted with per-unit and total figures, packaging notes, and recommended replacement cycles for high-wear pieces.'
      }
    ],
    products: [
      { name: 'Engraved drinkware & barware', substrate: 'Glass' },
      { name: 'Back-bar identification', substrate: 'Stainless Steel' },
      { name: 'Cocktail menu plaques', substrate: 'Brass' },
      { name: 'Reserved & VIP signage', substrate: 'Hardwood' },
      { name: 'Wayfinding & front-of-house signage', substrate: 'Brass' },
      { name: 'Service-station identification', substrate: 'Aluminium' },
      { name: 'Branded coasters & tabletop', substrate: 'Hardwood' },
      { name: 'Loyalty & dedication plaques', substrate: 'Brass' }
    ],
    substrates: SHARED_SUBSTRATES,
    ctaHeading: 'Opening, refreshing, or rolling out a concept?',
    ctaSubheading:
      'Send the brand pack and the floor plan. We respond within one business day with a written quote and substrate recommendations.',
    ctas: SHARED_CTAS,
    serviceJsonLdName: 'Bar & Restaurant Engraving',
    serviceJsonLdDescription:
      'Engraved drinkware, bar signage, branded barware, and hospitality identification for restaurants, bars, and F&B groups across Connecticut and the tri-state region.'
  },
  {
    slug: 'corporate',
    routeTitle: 'Corporate Engraving — Awards, Recognition, Office Signage',
    seoTitle: 'Corporate Awards & Office Signage Engraving | Stamford CT | Amarka',
    seoDescription:
      'Custom engraved corporate awards, recognition plaques, donor walls, and architectural office signage for corporate campuses, headquarters, and recognition programmes in Connecticut and the tri-state region.',
    seoKeywords: [
      'corporate awards engraving Connecticut',
      'recognition plaques Stamford CT',
      'office signage engraving Connecticut',
      'engraved donor walls corporate',
      'architectural office signage Stamford',
      'corporate gifts engraving Connecticut',
      'employee recognition plaques',
      'custom corporate plaques Connecticut'
    ],
    badge: 'Corporate',
    heroHeading: 'Engraved recognition and corporate signage that holds its weight.',
    heroSubheading:
      'Awards, recognition plaques, donor walls, executive gifts, and architectural office signage produced in Stamford, CT for corporate campuses and recognition programmes across Connecticut and the tri-state region.',
    sections: [
      {
        heading: 'Recognition that matches the moment',
        body:
          'Service awards, retirement plaques, founders’ recognition, and named-gift dedications. Each piece is produced to a specification document — substrate, dimension, finish, copy — that the recipient and the programme owner both sign off before production begins.'
      },
      {
        heading: 'Office signage that survives the lease',
        body:
          'Architectural panels, boardroom identification, executive suite signage, and wayfinding for corporate floors. Mounted hardware specified to building standards; substrate finishes selected for ten-year wear, not photo day.'
      },
      {
        heading: 'Programme-level production',
        body:
          'Annual recognition cycles, founders’ campaigns, and donor wall expansions are run as standing programmes. We hold artwork, dimensions, and substrate notes against your account so each year’s additions match the original installation exactly.'
      },
      {
        heading: 'Approval workflow that fits compliance',
        body:
          'Written quotes, dimensioned proofs, and final-approval sign-off are documented at every step. Files and approvals are retained for the life of the programme, available on request for procurement and audit reviews.'
      }
    ],
    products: [
      { name: 'Custom corporate awards', substrate: 'Brass' },
      { name: 'Recognition & dedication plaques', substrate: 'Brass' },
      { name: 'Donor walls', substrate: 'Stainless Steel' },
      { name: 'Architectural office panels', substrate: 'Aluminium' },
      { name: 'Boardroom identification', substrate: 'Hardwood' },
      { name: 'Executive gifts & desk pieces', substrate: 'Hardwood' },
      { name: 'Wayfinding signage', substrate: 'Brass' },
      { name: 'Branded acrylic awards', substrate: 'Acrylic' }
    ],
    substrates: SHARED_SUBSTRATES,
    ctaHeading: 'Running a recognition programme or office build-out?',
    ctaSubheading:
      'Send the brief or the build package. We respond within one business day with a written quote, substrate notes, and proof timing.',
    ctas: SHARED_CTAS,
    serviceJsonLdName: 'Corporate Engraving — Awards, Recognition, Office Signage',
    serviceJsonLdDescription:
      'Custom engraved corporate awards, recognition plaques, donor walls, and architectural office signage for corporate campuses and recognition programmes in Connecticut and the tri-state region.'
  },
  {
    slug: 'golf-clubs',
    routeTitle: 'Golf & Country Club Engraving — Trophies, Member Signage, Bag Tags',
    seoTitle: 'Golf & Country Club Engraving | Trophies & Signage | Stamford CT | Amarka',
    seoDescription:
      'Engraved golf trophies, member-board signage, bag tags, donor recognition, and clubhouse identification for golf and country clubs throughout Connecticut and the tri-state region.',
    seoKeywords: [
      'golf trophy engraving Connecticut',
      'country club signage Stamford CT',
      'engraved bag tags golf',
      'member board engraving Connecticut',
      'clubhouse signage engraving',
      'golf donor recognition plaques',
      'tournament awards engraving Stamford',
      'club championship trophy engraving Connecticut'
    ],
    badge: 'Golf & Country Clubs',
    heroHeading: 'Engraved trophies, member signage, and clubhouse identity for clubs that keep records.',
    heroSubheading:
      'Tournament awards, member-board signage, bag tags, donor walls, and clubhouse identification produced in Stamford, CT for golf and country clubs across Connecticut and the tri-state region.',
    sections: [
      {
        heading: 'Tournament and championship awards',
        body:
          'Club championships, member-guest events, charity tournaments, and member milestones. Each award is produced to programme standard so the engraving on this year’s trophy matches the engraving on every previous year — same typeface, same depth, same substrate.'
      },
      {
        heading: 'Member-board engraving on the club calendar',
        body:
          'Annual updates to champions boards, captains lists, and founders walls are scheduled around your event calendar. We hold board templates, typography, and substrate notes against your account so each year’s engraving lines up exactly with prior years.'
      },
      {
        heading: 'Clubhouse signage and wayfinding',
        body:
          'Pro shop, locker room, dining, and member-area signage produced to architectural specification. Substrates selected for clubhouse environment — brass and hardwood for traditional rooms, aluminium and stainless for service and back-of-house.'
      },
      {
        heading: 'Bag tags, lockers, and member personalisation',
        body:
          'Member bag tags, locker plates, and personalised gifts produced in batched programmes. Annual member-roster updates handled as a standing engagement so onboarding new members ships on a known cycle.'
      }
    ],
    products: [
      { name: 'Tournament & championship awards', substrate: 'Brass' },
      { name: 'Engraved bag tags', substrate: 'Brass' },
      { name: 'Member-board signage', substrate: 'Hardwood' },
      { name: 'Locker plates', substrate: 'Brass' },
      { name: 'Donor & founders walls', substrate: 'Brass' },
      { name: 'Clubhouse wayfinding', substrate: 'Brass' },
      { name: 'Pro-shop & service signage', substrate: 'Aluminium' },
      { name: 'Custom plaques & dedications', substrate: 'Brass' }
    ],
    substrates: SHARED_SUBSTRATES,
    ctaHeading: 'Running a tournament, member update, or clubhouse refresh?',
    ctaSubheading:
      'Send the event calendar or the build package. We respond within one business day with a written quote and substrate recommendations.',
    ctas: SHARED_CTAS,
    serviceJsonLdName: 'Golf & Country Club Engraving',
    serviceJsonLdDescription:
      'Engraved golf trophies, member-board signage, bag tags, donor recognition, and clubhouse identification for golf and country clubs throughout Connecticut and the tri-state region.'
  }
];

export const SERVICE_VERTICAL_SLUGS: ReadonlyArray<string> = SERVICE_VERTICALS.map(v => v.slug);

export function findVerticalBySlug(slug: string | null | undefined): VerticalLandingContent | undefined {
  if (!slug) return undefined;
  return SERVICE_VERTICALS.find(v => v.slug === slug);
}
