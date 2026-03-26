export type AudienceType =
  | 'interior_designers'
  | 'general_contractors'
  | 'bars_restaurants'
  | 'corporate_offices';

export type CaseStudyType = 'hospitality' | 'trade' | 'corporate' | 'architectural';

export type CaseStudyStatus = 'in_progress' | 'complete';

export interface VerticalCard {
  id: AudienceType;
  icon: string;
  title: string;
  description: string;
  href: string;
  fragment?: string;
}

export interface TrustedByLabel {
  label: string;
}

export interface CaseStudyImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface CaseStudy {
  id: string;
  projectName: string;
  slug: string;
  clientType: CaseStudyType;
  audienceTags: AudienceType[];
  location: string;
  brief: string;
  description: string;
  materials: string[];
  technique: string[];
  images: CaseStudyImage[];
  status: CaseStudyStatus;
  featured: boolean;
  featuredOnHome: boolean;
  published: boolean;
  ctaLabel: string;
  ctaHref: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCommission {
  id: string;
  slug: string;
  title: string;
  description: string;
  materials: string[];
  typicalLeadTime: string;
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
  published: boolean;
}

export interface DownloadAsset {
  id: string;
  slug: string;
  title: string;
  description: string;
  fileUrl: string;
  storagePath: string;
  category: 'spec_sheet' | 'lookbook' | 'material_guide';
  gated: boolean;
  published: boolean;
}

export interface TradeBenefit {
  title: string;
  description: string;
}

export interface TradeStep {
  step: string;
  title: string;
  description: string;
}

export interface AudienceSection {
  id: AudienceType;
  title: string;
  intro: string;
  bullets: string[];
  icon?: string;
}

export interface HomeContent {
  trustedBy: TrustedByLabel[];
  verticals: VerticalCard[];
  tradeBenefits: TradeBenefit[];
  featuredProjectSlug: string;
}

export interface StudioSettings {
  brandStatement: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  tradeHeadline: string;
  tradeSubheadline: string;
  responseWindow: string;
  turnaround: string;
  location: string;
  serviceArea: string;
}

export interface UploadRef {
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface EnquirySubmission {
  id?: string;
  type: 'standard' | 'trade';
  fullName: string;
  company?: string;
  email: string;
  role: 'designer' | 'gc' | 'hospitality' | 'corporate' | 'other';
  projectType: string;
  preferredMaterial?: string;
  estimatedQuantity?: string;
  targetTimeline?: string;
  projectDescription: string;
  fileUploads: UploadRef[];
  sourcePage: string;
  leadTags: string[];
  createdAt?: string;
}

export interface TradeApplication {
  id?: string;
  companyName: string;
  contactName: string;
  email: string;
  role: 'designer' | 'gc' | 'other';
  projectType: string;
  estimatedQuantity: string;
  materialPreference?: string;
  timeline?: string;
  notes?: string;
  specSheetUploads: UploadRef[];
  leadTags: string[];
  createdAt?: string;
}
