import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { ReplaySubject } from 'rxjs';
import { BrandConfigService } from '../core/services/brand-config.service';

export interface AppSettings {
  // Brand & Logo
  brandLogo: string;
  brandLogoLight: string;
  
  // General
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  
  // Stripe
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeCurrency: string;
  stripeTestMode: boolean;
  
  // Email
  emailProvider: string;
  emailApiKey: string;
  emailFrom: string;
  emailFromName: string;
  
  // Shipping
  shippingEnabled: boolean;
  freeShippingThreshold: number;
  defaultShippingCost: number;
  shippingEstimate: string;
  
  // Analytics
  googleAnalyticsId: string;
  facebookPixelId: string;
  analyticsEnabled: boolean;
  cookieConsentRequired: boolean;

  // SEO & Meta
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  twitterCard: string;

  // Social Media
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  whatsappNumber: string;

  // Security
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  maxLoginAttempts: number;
  enableCaptcha: boolean;
  recaptchaSiteKey: string;
  allowedDomains: string;

  // Notifications
  orderEmailEnabled: boolean;
  lowStockAlerts: boolean;
  lowStockThreshold: number;
  newUserNotifications: boolean;
  dailyReportEnabled: boolean;
  notificationEmail: string;

  // Business Info
  businessName: string;
  taxId: string;
  businessRegistration: string;
  supportHours: string;
  returnPolicy: string;
  privacyPolicy: string;
  termsOfService: string;

  // Advanced
  enableCaching: boolean;
  apiRateLimit: number;
  debugMode: boolean;
  logLevel: string;
  enableCompression: boolean;
  cdnUrl: string;

  // Inventory
  trackInventory: boolean;
  allowBackorders: boolean;
  autoRestockEnabled: boolean;
  hideOutOfStock: boolean;
  stockReserveTime: number;

  // Home Hero Images
  heroImagesJson: string; // JSON string of HeroImage[]

  // Page Hero Settings
  serviciosHeroImage: string;
  serviciosHeroTitle: string;
  serviciosHeroSubtitle: string;
  galeriaHeroImage: string;
  galeriaHeroTitle: string;
  galeriaHeroSubtitle: string;
  contactoHeroImage: string;
  contactoHeroTitle: string;
  contactoHeroSubtitle: string;
}

export interface HeroImage {
  id: string;
  url: string;
  webpUrl?: string;
  alt: string;
  title: string;
  description: string;
  order: number;
  active: boolean;
}

// Sensitive fields that should never be sent to frontend
const SENSITIVE_FIELDS: (keyof AppSettings)[] = [
  'stripeSecretKey',
  'stripeWebhookSecret',
  'emailApiKey',
];

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private brandConfig = inject(BrandConfigService);
  private readonly SETTINGS_DOC_ID = 'app';
  private readonly PUBLIC_SETTINGS_DOC_ID = 'public';
  private settingsCache: AppSettings | null = null;
  private settingsPromise: Promise<AppSettings> | null = null;
  private settingsSubject = new ReplaySubject<AppSettings>(1);
  private authUserPromise: Promise<any> | null = null;

  /** Observable stream of settings changes */
  settings$ = this.settingsSubject.asObservable();

  /**
   * Get application settings from Firestore
   */
  async getSettings(forceRefresh = false): Promise<AppSettings> {
    if (this.settingsCache && !forceRefresh) {
      return this.settingsCache;
    }

    if (this.settingsPromise && !forceRefresh) {
      return this.settingsPromise;
    }

    this.settingsPromise = this.fetchSettings()
      .then(settings => {
        this.settingsCache = settings;
        this.settingsSubject.next(settings);
        return settings;
      })
      .finally(() => {
        this.settingsPromise = null;
      });

    return this.settingsPromise;
  }

  private async fetchSettings(): Promise<AppSettings> {
    try {
      // Check if user is admin (has access to full settings)
      const isAdmin = await this.isUserAdmin();
      const docId = isAdmin ? this.SETTINGS_DOC_ID : this.PUBLIC_SETTINGS_DOC_ID;
      
      const docRef = doc(this.firestore, 'settings', docId);
      const docSnap = await getDoc(docRef);
      const defaults = this.getDefaultSettings();
      
      if (docSnap.exists()) {
        const docData = docSnap.data();
        const settings = { ...defaults, ...docData } as AppSettings;
        
        // For non-admins, ensure sensitive fields are empty
        if (!isAdmin) {
          SENSITIVE_FIELDS.forEach(field => {
            (settings[field] as any) = '';
          });
        }
        
        return settings;
      }
      
      // Return default settings if none exist
      return defaults;
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Check if current user is admin
   */
  private async isUserAdmin(): Promise<boolean> {
    const user = await this.waitForAuthUser();
    
    if (!user) {
      return false;
    }
    
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
      
      if (userDoc.exists()) {
        const role = userDoc.data()?.['role'];
        return role === 'admin';
      }
      
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Wait for the initial auth user (handles Firebase async auth init)
   */
  private async waitForAuthUser(timeoutMs = 1500): Promise<any> {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      return currentUser;
    }

    const maybeAuthStateReady = (this.auth as Auth & { authStateReady?: () => Promise<void> }).authStateReady;
    if (maybeAuthStateReady) {
      try {
        await maybeAuthStateReady.call(this.auth);
        return this.auth.currentUser;
      } catch (error) {
        console.warn('[SettingsService] authStateReady() failed, falling back to listener', error);
      }
    }

    if (typeof window === 'undefined') {
      return null;
    }

    if (!this.authUserPromise) {
      this.authUserPromise = new Promise(resolve => {
        let resolved = false;
        let timerId: ReturnType<typeof setTimeout> | undefined;
        let unsubscribe: (() => void) | null = null;

        const finish = (user: any) => {
          if (resolved) {
            return;
          }
          resolved = true;
          this.authUserPromise = null;
          if (timerId !== undefined) {
            clearTimeout(timerId);
            timerId = undefined;
          }
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
          resolve(user ?? null);
        };

        timerId = setTimeout(() => finish(this.auth.currentUser), timeoutMs);
        unsubscribe = onAuthStateChanged(
          this.auth,
          user => finish(user),
          () => finish(null)
        );
        if (resolved && unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      });
    }

    return this.authUserPromise;
  }

  /**
   * Get public settings document (includes stats)
   */
  async getPublicSettings(): Promise<any> {
    try {
      const docRef = doc(this.firestore, 'settings', this.PUBLIC_SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting public settings:', error);
      return null;
    }
  }

  /**
   * Save application settings to Firestore
   * Admin-only: Saves full settings to 'app' doc and public copy to 'public' doc
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No authenticated user. Please sign in again.');
      }
      
      // Check if user is admin
      const userDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (userData?.['role'] !== 'admin') {
        throw new Error('Unauthorized: Only admins can save settings.');
      }
      
      // Convert settings to plain object (remove any Firestore metadata/proxies)
      const plainSettings = JSON.parse(JSON.stringify(settings));
      
      // Save full settings (admin only)
      const adminDocRef = doc(this.firestore, 'settings', this.SETTINGS_DOC_ID);
      await setDoc(adminDocRef, plainSettings, { merge: true });
      
      // Create public copy without sensitive fields
      const publicSettings = { ...plainSettings };
      SENSITIVE_FIELDS.forEach(field => {
        delete (publicSettings as any)[field];
      });
      
      const publicDocRef = doc(this.firestore, 'settings', this.PUBLIC_SETTINGS_DOC_ID);
      await setDoc(publicDocRef, publicSettings, { merge: true });
      
      this.settingsCache = settings;
      this.settingsSubject.next(settings);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): AppSettings {
    const site = this.brandConfig.site;
    const brandName = site.seo?.siteName || site.brand.shortName || site.brand.name;
    const maintenanceMessage =
      site.maintenance?.description ||
      'We are performing scheduled maintenance. Please check back soon.';

    return {
      // Brand & Logo
      brandLogo: '/Logo Clear.png',
      brandLogoLight: '',
      
      // General
      siteName: brandName,
      siteDescription: site.brand.description || site.hero?.subtitle || 'Premium storefront template',
      contactEmail: site.contact.email,
      contactPhone: site.contact.phone || '',
      contactAddress: site.contact.address || '',
      maintenanceMode: this.brandConfig.features['maintenanceMode'] ?? false,
      maintenanceMessage,
      
      // Stripe
      stripePublicKey: '',
      stripeSecretKey: '',
      stripeWebhookSecret: '',
      stripeCurrency: 'usd',
      stripeTestMode: true,
      
      // Email
      emailProvider: 'brevo',
      emailApiKey: '',
      emailFrom: site.notifications?.emailFrom || site.contact.email,
      emailFromName: site.notifications?.emailFromName || brandName,
      
      // Shipping
      shippingEnabled: true,
      freeShippingThreshold: 100,
      defaultShippingCost: 8,
      shippingEstimate: '3-5 business days',
      
      // Analytics
      googleAnalyticsId: '',
      facebookPixelId: '',
      analyticsEnabled: true,
      cookieConsentRequired: true,

      // SEO & Meta
      metaTitle: site.seo?.defaultTitle || `${brandName} storefront`,
      metaDescription: site.seo?.defaultDescription || site.brand.description || '',
      metaKeywords: (site.seo?.defaultKeywords || []).join(', '),
      ogImage: site.seo?.socialImage || '',
      twitterCard: 'summary_large_image',

      // Social Media
      facebookUrl: '',
      twitterUrl: '',
      instagramUrl: '',
      linkedinUrl: '',
      youtubeUrl: '',
      whatsappNumber: site.contact.whatsapp || '',

      // Security
      twoFactorEnabled: false,
      sessionTimeout: 30,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      enableCaptcha: false,
      recaptchaSiteKey: '',
      allowedDomains: '',

      // Notifications
      orderEmailEnabled: true,
      lowStockAlerts: true,
      lowStockThreshold: 10,
      newUserNotifications: false,
      dailyReportEnabled: false,
      notificationEmail: '',

      // Business Info
      businessName: site.legal?.businessName || brandName,
      taxId: '',
      businessRegistration: '',
      supportHours: site.contact.supportHours || '',
      returnPolicy: site.legal?.returnPolicyUrl || '/return-policy',
      privacyPolicy: site.legal?.privacyPolicyUrl || '/privacy-policy',
      termsOfService: site.legal?.termsUrl || '/terms',

      // Advanced
      enableCaching: true,
      apiRateLimit: 60,
      debugMode: false,
      logLevel: 'info',
      enableCompression: true,
      cdnUrl: '',

      // Inventory
      trackInventory: true,
      allowBackorders: false,
      autoRestockEnabled: true,
      hideOutOfStock: false,
      stockReserveTime: 15,

      // Home Hero Images - empty by default, managed from admin
      heroImagesJson: '',

      // Page Hero Settings
      serviciosHeroImage: '/assets/services/hero-services.jpg',
      serviciosHeroTitle: 'Precision engraving, elevated gifts',
      serviciosHeroSubtitle: 'Custom engraving on metal, glass, wood, and leather with fast turnaround and gift-ready packaging.',
      galeriaHeroImage: '/assets/gallery/hero-gallery.jpg',
      galeriaHeroTitle: 'Event design, florals, and seasonal installs we love',
      galeriaHeroSubtitle: 'Explore weddings, brand activations, private celebrations, and botanical styling crafted with our ivory and gold aesthetic.',
      contactoHeroImage: '/assets/contact/hero-contact.jpg',
      contactoHeroTitle: 'Tell us about your celebration',
      contactoHeroSubtitle: 'Share your date, location, and vision. We respond within one business day to craft a bespoke plan for your event.',

    };
  }

  /**
   * Get hero images from settings
   */
  getHeroImages(): HeroImage[] {
    try {
      const heroImagesJson = this.settingsCache?.heroImagesJson || this.getDefaultSettings().heroImagesJson;
      
      if (!heroImagesJson || heroImagesJson.trim() === '') {
        return [];
      }
      
      const images: HeroImage[] = JSON.parse(heroImagesJson);
      
      const activeImages = images
        .filter(img => img.active)
        .sort((a, b) => a.order - b.order);
      
      return activeImages;
    } catch (error) {
      console.error('Error parsing hero images:', error);
      return [];
    }
  }

  /**
   * Update hero images
   */
  async updateHeroImages(images: HeroImage[]): Promise<void> {
    const settings = await this.getSettings();
    const jsonString = JSON.stringify(images);
    settings.heroImagesJson = jsonString;
    await this.saveSettings(settings);
  }
}
