import {
  AudienceSection,
  CaseStudy,
  DownloadAsset,
  HomeContent,
  ServiceCommission,
  StudioSettings,
  TradeStep,
} from '../models/studio';

export const STUDIO_SETTINGS: StudioSettings = {
  brandStatement: 'Precision laser engraving for the NYC trade.',
  heroEyebrow: 'Precision Laser Engraving · NYC Metro',
  heroTitle: 'Your name, permanently etched in brass, steel, glass, and hardwood.',
  heroSubtitle:
    'Amarka is the Stamford studio that interior designers, GCs, and hospitality teams rely on when a project demands engraving done right — on time, on spec, on material.',
  tradeHeadline: 'One account. Priority access to the studio.',
  tradeSubheadline:
    'Trade accounts unlock preferred pricing, dedicated turnaround, and a single point of contact for every commission.',
  responseWindow: 'Response within one business day.',
  turnaround: '5–10 business day turnaround',
  location: 'Stamford, CT',
  serviceArea: 'NYC Metro'
};

export const HOME_CONTENT: HomeContent = {
  trustedBy: [
    { label: 'Private Clubs' },
    { label: 'Hospitality Groups' },
    { label: 'Interior Design Studios' },
    { label: 'Commercial Fit-Out Teams' }
  ],
  verticals: [
    {
      id: 'interior_designers',
      icon: 'drafting_compass',
      title: 'Interior Designers',
      description: 'Engraved elements supplied to trade spec — formal quotes, sampling, and lead times that fit your FF&E schedule.',
      href: '/clients#interior-designers'
    },
    {
      id: 'general_contractors',
      icon: 'construction',
      title: 'General Contractors',
      description: 'Signage packages, wayfinding systems, and architectural accents — quoted in 24 hours, delivered in 5–10 business days.',
      href: '/clients#general-contractors'
    },
    {
      id: 'bars_restaurants',
      icon: 'wine_bar',
      title: 'Bars & Restaurants',
      description: 'Tap handles, menu boards, bar signage, and branded service elements that give your venue a crafted, permanent identity.',
      href: '/clients#bars-restaurants'
    },
    {
      id: 'corporate_offices',
      icon: 'apartment',
      title: 'Corporate Offices',
      description: 'Lobby directories, suite signage, executive awards, and building-wide wayfinding for corporate and commercial environments.',
      href: '/clients#corporate-offices'
    }
  ],
  tradeBenefits: [
    {
      title: 'Preferred trade pricing',
      description: 'Account-based quoting that rewards repeat volume and multi-project relationships.'
    },
    {
      title: 'Reserved production slots',
      description: 'Priority scheduling so your project stays on track, even under tight construction timelines.'
    },
    {
      title: 'Dedicated project contact',
      description: 'One studio partner from first brief through fabrication, revisions, and delivery coordination.'
    }
  ],
  featuredProjectSlug: 'hospitality-wayfinding-prototype'
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'case-hospitality-wayfinding',
    projectName: 'Hospitality Wayfinding Prototype',
    slug: 'hospitality-wayfinding-prototype',
    clientType: 'hospitality',
    audienceTags: ['bars_restaurants', 'interior_designers'],
    location: 'New York City',
    brief: 'Room markers, directional plates, and branded inserts for a premium hospitality concept.',
    description:
      'Engraved wayfinding elements prototyped in aged brass and powder-coated aluminium — designed to set the tone across the guest experience.',
    materials: ['Aged brass', 'Powder-coated aluminium'],
    technique: ['Laser engraving', 'Surface finishing'],
    images: [{ url: '/Logo Clear2.png', alt: 'Hospitality prototype placeholder' }],
    status: 'complete',
    featured: false,
    featuredOnHome: false,
    published: true,
    ctaLabel: 'Start a commission like this',
    ctaHref: '/enquire',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },
  {
    id: 'case-corporate-awards',
    projectName: 'Corporate Recognition Programme',
    slug: 'corporate-recognition-programme',
    clientType: 'corporate',
    audienceTags: ['corporate_offices'],
    location: 'NYC Metro',
    brief: 'Milestone awards and branded recognition pieces for a corporate headquarters.',
    description:
      'Engraved awards in blackened steel, acrylic, and walnut — designed for executive presentation and long-term display in premium workplace environments.',
    materials: ['Blackened steel', 'Acrylic', 'Walnut'],
    technique: ['Laser engraving', 'Assembly'],
    images: [{ url: '/Logo Clear2.png', alt: 'Corporate programme placeholder' }],
    status: 'complete',
    featured: false,
    featuredOnHome: false,
    published: true,
    ctaLabel: 'Start a commission like this',
    ctaHref: '/enquire',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  }
];

export const SERVICES: ServiceCommission[] = [
  {
    id: 'architectural-signage-systems',
    slug: 'architectural-signage-systems',
    title: 'Architectural Signage Systems',
    description: 'Wayfinding, room markers, plaque systems, and identification pieces — fabricated to spec for commercial and hospitality interiors.',
    materials: ['Brass', 'Stainless steel', 'Aluminium', 'Acrylic'],
    typicalLeadTime: '5-10 business days',
    ctaLabel: 'Discuss a signage package',
    ctaHref: '/enquire',
    featured: true,
    published: true
  },
  {
    id: 'custom-bar-restaurant-fitout',
    slug: 'custom-bar-restaurant-fitout',
    title: 'Custom Bar & Restaurant Fitout',
    description: 'Back-bar details, menu displays, tap handles, and branded spatial elements — engraved for venues that take their identity seriously.',
    materials: ['Brass', 'Mirror acrylic', 'Powder-coated metals'],
    typicalLeadTime: '5-10 business days',
    ctaLabel: 'Start a hospitality brief',
    ctaHref: '/enquire',
    published: true
  },
  {
    id: 'trade-supply',
    slug: 'trade-supply',
    title: 'Trade Supply (Designer / GC)',
    description: 'Dependable fabrication for design studios and GCs who need repeatability, documentation, and scheduling they can count on.',
    materials: ['Specified to brief'],
    typicalLeadTime: '5-10 business days',
    ctaLabel: 'Open a trade conversation',
    ctaHref: '/trade',
    published: true
  },
  {
    id: 'corporate-awards-recognition',
    slug: 'corporate-awards-recognition',
    title: 'Corporate Awards & Recognition',
    description: 'Executive awards, donor walls, and commemorative pieces — premium finishing and presentation-ready packaging.',
    materials: ['Metal', 'Acrylic', 'Wood'],
    typicalLeadTime: '5-10 business days',
    ctaLabel: 'Plan a recognition project',
    ctaHref: '/enquire',
    published: true
  },
  {
    id: 'bespoke-architectural-accents',
    slug: 'bespoke-architectural-accents',
    title: 'Bespoke Architectural Accents',
    description: 'Engraved metal and material accents integrated into joinery, interior detailing, and spatial branding — the details that elevate a space.',
    materials: ['Brass', 'Bronze-toned aluminium', 'Steel'],
    typicalLeadTime: '5-10 business days',
    ctaLabel: 'Review material options',
    ctaHref: '/materials',
    published: true
  },
  {
    id: 'branded-environmental-elements',
    slug: 'branded-environmental-elements',
    title: 'Branded Environmental Elements',
    description: 'Signage and engraved branded components that translate your identity into the physical environment — lobby to rooftop.',
    materials: ['Metal', 'Acrylic', 'Composite panels'],
    typicalLeadTime: '5-10 business days',
    ctaLabel: 'Shape a branded environment',
    ctaHref: '/enquire',
    published: true
  }
];

export const AUDIENCE_SECTIONS: AudienceSection[] = [
  {
    id: 'interior_designers',
    title: 'Interior Designers & Architecture Firms',
    intro: 'We support specification-driven hospitality and workplace projects with fabrication guidance, finish sampling, and quotes that move at your pace.',
    bullets: [
      'Material and finish guidance from concept through spec',
      'Design-sensitive detailing for hospitality and workplace interiors',
      'Turnaround aligned to your FF&E procurement schedule'
    ]
  },
  {
    id: 'general_contractors',
    title: 'General Contractors & Construction Companies',
    intro: 'A dependable fabrication partner for signage packages, install schedules, and late-stage value engineering — no surprises.',
    bullets: [
      'Clear lead-time commitments on every order',
      'Repeatable fabrication for multi-piece and multi-floor packages',
      'Trade account support with net-30 invoicing'
    ]
  },
  {
    id: 'bars_restaurants',
    title: 'Premium Bars & Restaurants',
    intro: 'Engraved details that sharpen the guest experience — from branded bar fitout pieces to front-of-house wayfinding.',
    bullets: [
      'Finishes selected for high-traffic hospitality environments',
      'Branded elements for front-of-house, back-bar, and service areas',
      'Fast fabrication for new openings, refreshes, and seasonal updates'
    ]
  },
  {
    id: 'corporate_offices',
    title: 'Corporate Offices & Building Operators',
    intro: 'Polished signage, recognition programmes, and environmental branding for executive suites, amenity spaces, and shared workplace environments.',
    bullets: [
      'Recognition walls, donor displays, and milestone awards',
      'Room identification, amenity signage, and lobby directories',
      'Responsive support for facilities teams and building operators'
    ]
  }
];

export const TRADE_STEPS: TradeStep[] = [
  {
    step: '01',
    title: 'Send your brief',
    description: 'Share drawings, quantities, dimensions, and timeline through our trade form. We respond within one business day.'
  },
  {
    step: '02',
    title: 'Lock materials and schedule',
    description: 'We confirm the fabrication approach, material selection, and a firm production window that fits your project timeline.'
  },
  {
    step: '03',
    title: 'We build. You install.',
    description: 'Your project moves into production with a dedicated contact handling revisions, proofing, and delivery coordination.'
  }
];

export const DOWNLOADS: DownloadAsset[] = [
  {
    id: 'trade-spec-sheet',
    slug: 'trade-spec-sheet',
    title: 'Trade Spec Sheet',
    description: 'An overview of materials, lead times, and commissioning information for trade clients.',
    fileUrl: '/assets/amarka-trade-spec-sheet.pdf',
    storagePath: 'public/downloads/trade-spec-sheet.pdf',
    category: 'spec_sheet',
    gated: false,
    published: true
  }
];
