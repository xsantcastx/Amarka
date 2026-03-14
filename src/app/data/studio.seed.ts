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
  brandStatement: 'Precision laser engraving studio for the NYC trade.',
  heroEyebrow: 'Bespoke Laser Engraving Studio · NYC Metro',
  heroTitle: 'Precision-fabricated engraved elements for hospitality, workplace, and architectural interiors.',
  heroSubtitle:
    'Amarka partners with interior designers, general contractors, hospitality groups, and building operators from our Stamford, CT studio with a dependable 5-10 business day turnaround.',
  tradeHeadline: 'Supplying the NYC Trade Since 2024',
  tradeSubheadline:
    'A preferred laser engraving and fabrication partner for designers, contractors, hospitality operators, and premium commercial interiors.',
  responseWindow: 'We’ll respond within 24 hours.',
  turnaround: '5-10 business day turnaround',
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
      description: 'Specification-friendly engraved elements for hospitality, workplace, and residential amenity spaces.',
      href: '/clients#interior-designers'
    },
    {
      id: 'general_contractors',
      icon: 'construction',
      title: 'General Contractors',
      description: 'Reliable fabrication partner for signage packages, wayfinding systems, and commercial installation schedules.',
      href: '/clients#general-contractors'
    },
    {
      id: 'bars_restaurants',
      icon: 'wine_bar',
      title: 'Bars & Restaurants',
      description: 'Bar fitout details, branded service elements, and premium engraved touchpoints for hospitality concepts.',
      href: '/clients#bars-restaurants'
    },
    {
      id: 'corporate_offices',
      icon: 'apartment',
      title: 'Corporate Offices',
      description: 'Architectural signage, recognition pieces, and branded environmental elements for high-trust workplaces.',
      href: '/clients#corporate-offices'
    }
  ],
  tradeBenefits: [
    {
      title: 'Preferred pricing',
      description: 'Account-based quoting for repeat trade clients and FF&E procurement teams.'
    },
    {
      title: 'Dedicated lead time slots',
      description: 'Priority scheduling for time-sensitive hospitality and construction programmes.'
    },
    {
      title: 'Single point of contact',
      description: 'One studio partner from initial brief through fabrication, revisions, and delivery.'
    }
  ],
  featuredProjectSlug: 'private-golf-club-door-signage'
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'case-private-golf-club',
    projectName: 'Private Golf Club, Connecticut',
    slug: 'private-golf-club-door-signage',
    clientType: 'architectural',
    audienceTags: ['interior_designers', 'general_contractors'],
    location: 'Connecticut',
    brief: 'Door signage system for a private golf club renovation.',
    description:
      'A brushed brass signage package in development for a private golf club, pairing precise typography, durable fixing details, and a refined hospitality finish.',
    materials: ['Brushed brass', 'Black infill', 'Architectural adhesive backers'],
    technique: ['Laser engraving', 'Paint fill', 'Finishing and sealing'],
    images: [
      { url: '/Logo Clear2.png', alt: 'Amarka project placeholder' }
    ],
    status: 'in_progress',
    featured: true,
    featuredOnHome: true,
    published: true,
    ctaLabel: 'Start a similar project',
    ctaHref: '/enquire',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },
  {
    id: 'case-hospitality-wayfinding',
    projectName: 'Hospitality Wayfinding Prototype',
    slug: 'hospitality-wayfinding-prototype',
    clientType: 'hospitality',
    audienceTags: ['bars_restaurants', 'interior_designers'],
    location: 'New York City',
    brief: 'Prototype wayfinding package for a premium hospitality concept.',
    description:
      'A concept development package showing engraved room markers, directional plates, and branded insert details for hospitality interiors.',
    materials: ['Aged brass', 'Powder-coated aluminium'],
    technique: ['Laser engraving', 'Surface finishing'],
    images: [{ url: '/Logo Clear2.png', alt: 'Hospitality prototype placeholder' }],
    status: 'complete',
    featured: false,
    featuredOnHome: false,
    published: true,
    ctaLabel: 'Start a similar project',
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
    brief: 'Recognition pieces for executive and staff milestones.',
    description:
      'Engraved awards and branded recognition elements designed for premium workplace environments and executive gifting programmes.',
    materials: ['Blackened steel', 'Acrylic', 'Walnut'],
    technique: ['Laser engraving', 'Assembly'],
    images: [{ url: '/Logo Clear2.png', alt: 'Corporate programme placeholder' }],
    status: 'complete',
    featured: false,
    featuredOnHome: false,
    published: true,
    ctaLabel: 'Start a similar project',
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
    description: 'Wayfinding, room signage, plaque systems, and architectural identification pieces fabricated for commercial and hospitality interiors.',
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
    description: 'Engraved back-bar details, service elements, menu displays, and branded spatial moments for premium hospitality venues.',
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
    description: 'Reliable fabrication support for design studios and contractors requiring repeatability, documentation, and scheduling confidence.',
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
    description: 'Executive awards, donor recognition, and branded commemorative pieces with premium finishing and presentation.',
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
    description: 'Engraved metal and material accents integrated into interior detailing, joinery, and spatial branding.',
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
    description: 'Signage and engraved branded components that translate identity into premium physical environments.',
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
    intro: 'We support specification-heavy hospitality and workplace projects with fabrication guidance, finish sampling, and clean quote turnaround.',
    bullets: [
      'Material and finish guidance at concept stage',
      'Design-sensitive detailing for hospitality and workplace interiors',
      'Fast response windows for ongoing studio workflows'
    ]
  },
  {
    id: 'general_contractors',
    title: 'General Contractors & Construction Companies',
    intro: 'We work as a dependable fabrication partner for signage packages, install schedules, and late-stage value engineering.',
    bullets: [
      'Clear lead-time communication',
      'Repeatable fabrication for multi-piece packages',
      'Trade-account support for ongoing commercial delivery'
    ]
  },
  {
    id: 'bars_restaurants',
    title: 'Premium Bars & Restaurants',
    intro: 'We produce engraved details that sharpen the hospitality experience, from branded bar fitout pieces to operational wayfinding.',
    bullets: [
      'Premium hospitality finishes',
      'Branded details for front-of-house and back-bar applications',
      'Fast fabrication windows for openings and refreshes'
    ]
  },
  {
    id: 'corporate_offices',
    title: 'Corporate Offices & Building Operators',
    intro: 'We fabricate polished signage, recognition pieces, and environmental branding for executive, amenity, and shared workplace environments.',
    bullets: [
      'Recognition and donor-style programmes',
      'Architectural room and amenity signage',
      'Responsive support for facilities and operator teams'
    ]
  }
];

export const TRADE_STEPS: TradeStep[] = [
  {
    step: '01',
    title: 'Share the brief',
    description: 'Send drawings, quantities, dimensions, and timeline requirements through the trade enquiry flow.'
  },
  {
    step: '02',
    title: 'Review materials and schedule',
    description: 'We confirm fabrication approach, material direction, and a realistic lead-time window.'
  },
  {
    step: '03',
    title: 'Approve and fabricate',
    description: 'Once approved, your project moves into production with a single studio contact and delivery coordination.'
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
