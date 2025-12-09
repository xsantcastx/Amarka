export interface NavigationLink {
  label: string;
  href: string;
  exact?: boolean;
}

export interface SocialLink {
  platform: string;
  href: string;
}

export interface CtaLink {
  label: string;
  href: string;
}

export interface SiteConfig {
  brand: {
    key: string;
    name: string;
    shortName?: string;
    tagline?: string;
    description?: string;
    domain?: string;
    logo: string;
    logoAlt?: string;
    favicon?: string;
  };
  contact: {
    email: string;
    phone?: string;
    phone2?: string;
    whatsapp?: string;
    address?: string;
    supportHours?: string;
  };
  theme?: {
    tokens?: Record<string, string>;
    fonts?: Record<string, string>;
  };
  hero?: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    badge?: string;
    primaryCta?: CtaLink;
    secondaryCta?: CtaLink;
  };
  navigation?: {
    header?: NavigationLink[];
    footer?: NavigationLink[];
    social?: SocialLink[];
  };
  seo?: {
    siteName?: string;
    titleTemplate?: string;
    defaultTitle?: string;
    defaultDescription?: string;
    defaultKeywords?: string[];
    socialImage?: string;
  };
  legal?: {
    businessName?: string;
    taxId?: string;
    supportEmail?: string;
    returnPolicyUrl?: string;
    privacyPolicyUrl?: string;
    termsUrl?: string;
  };
  maintenance?: {
    title?: string;
    description?: string;
  };
  notifications?: {
    emailFrom?: string;
    emailFromName?: string;
  };
}

export type FeatureFlags = Record<string, boolean>;

export interface EmailTemplates {
  notifications?: Record<
    string,
    {
      subject: string;
      preheader?: string;
    }
  >;
}
