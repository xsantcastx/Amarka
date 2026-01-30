import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { ImagePickerComponent } from '../../../shared/components/image-picker/image-picker.component';
import { HeroImagesManagerComponent } from '../../../shared/components/hero-images-manager/hero-images-manager.component';
import { ThemeManagerComponent } from '../../../shared/components/theme-manager/theme-manager.component';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';
import { SettingsService, AppSettings } from '../../../services/settings.service';

interface SettingSection {
  title: string;
  icon: string;
  color: string;
  settings: Setting[];
  expanded?: boolean;
  isCustomComponent?: boolean;
}

interface Setting {
  key: keyof AppSettings;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'image';
  value: any;
  options?: { label: string; value: any }[];
  description?: string;
  placeholder?: string;
  sensitive?: boolean;
  locked?: boolean;
  showValue?: boolean;
  storagePath?: string; // For image uploads
  helpText?: string; // For image picker help text
  hidden?: boolean; // For system fields that shouldn't display in UI
}

type MessageType = 'success' | 'error' | 'info';

@Component({
  selector: 'app-settings-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    AdminSidebarComponent,
    ImagePickerComponent,
    HeroImagesManagerComponent,
    ThemeManagerComponent
  ],
  templateUrl: './settings-admin.page.html',
  styleUrl: './settings-admin.page.scss'
})
export class SettingsAdminComponent extends LoadingComponentBase implements OnInit {
  private settingsService = inject(SettingsService);
  
  sections: SettingSection[] = [];
  isSaving = false;
  messageKey: string | null = null;
  messageType: 'success' | 'error' | 'info' = 'info';
  messageParams: Record<string, unknown> = {};
  
  currentSettings: AppSettings | null = null;
  private messageTimeout: any = null;


  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    await this.withLoading(async () => {
      this.currentSettings = await this.settingsService.getSettings();
      
      this.buildSections();
    });
  }
  
  private buildSections() {
    if (!this.currentSettings) return;
    
    this.sections = [
      {
        title: 'General Settings',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        color: 'blue',
        expanded: true,
        settings: [
          { 
            key: 'brandLogo', 
            label: 'Brand Logo', 
            type: 'image', 
            value: this.currentSettings.brandLogo || '/Logo Clear.png', 
            storagePath: 'settings/logos', 
            helpText: 'Upload your brand logo. This will appear in the header, footer, and loading screens. Recommended: PNG with transparent background, 200x200px minimum.'
          },
          { 
            key: 'brandLogoLight', 
            label: 'Light Logo (Optional)', 
            type: 'image', 
            value: this.currentSettings.brandLogoLight || '', 
            storagePath: 'settings/logos', 
            helpText: 'Optional light version of your logo for dark backgrounds. Leave empty to use the main logo everywhere.'
          },
          { key: 'siteName', label: 'Site Name', type: 'text', value: this.currentSettings.siteName, placeholder: 'Enter site name' },
          { key: 'siteDescription', label: 'Site Description', type: 'textarea', value: this.currentSettings.siteDescription, placeholder: 'Enter site description' },
          { key: 'contactEmail', label: 'Contact Email', type: 'text', value: this.currentSettings.contactEmail, placeholder: 'email@example.com' },
          { key: 'contactPhone', label: 'Contact Phone', type: 'text', value: this.currentSettings.contactPhone, placeholder: '+1 (800) 555-0199' },
          { key: 'contactAddress', label: 'Contact Address', type: 'textarea', value: this.currentSettings.contactAddress, placeholder: 'Company address and logistics details' },
          { key: 'maintenanceMode', label: 'Maintenance Mode', type: 'boolean', value: this.currentSettings.maintenanceMode, description: 'Enable to show maintenance page to visitors' },
          { key: 'maintenanceMessage', label: 'Maintenance Message', type: 'textarea', value: this.currentSettings.maintenanceMessage, placeholder: 'We are performing scheduled maintenance. Please check back soon.' }
        ]
      },
      {
        title: 'Home Hero Images',
        icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
        color: 'orange',
        expanded: false,
        settings: [],
        isCustomComponent: true
      },
      {
        title: 'Page Hero Settings',
        icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
        color: 'indigo',
        expanded: false,
        settings: [
          { key: 'serviciosHeroImage', label: 'Services Page - Hero Image', type: 'image', value: this.currentSettings.serviciosHeroImage, storagePath: 'settings/page-heroes', helpText: 'Recommended: 1200x600px or larger' },
          { key: 'serviciosHeroTitle', label: 'Services Page - Title', type: 'text', value: this.currentSettings.serviciosHeroTitle, placeholder: 'Enter hero title' },
          { key: 'serviciosHeroSubtitle', label: 'Services Page - Subtitle', type: 'textarea', value: this.currentSettings.serviciosHeroSubtitle, placeholder: 'Enter hero subtitle' },
          { key: 'galeriaHeroImage', label: 'Gallery Page - Hero Image', type: 'image', value: this.currentSettings.galeriaHeroImage, storagePath: 'settings/page-heroes', helpText: 'Recommended: 1200x600px or larger' },
          { key: 'galeriaHeroTitle', label: 'Gallery Page - Title', type: 'text', value: this.currentSettings.galeriaHeroTitle, placeholder: 'Enter hero title' },
          { key: 'galeriaHeroSubtitle', label: 'Gallery Page - Subtitle', type: 'textarea', value: this.currentSettings.galeriaHeroSubtitle, placeholder: 'Enter hero subtitle' },
          { key: 'contactoHeroImage', label: 'Contact Page - Hero Image', type: 'image', value: this.currentSettings.contactoHeroImage, storagePath: 'settings/page-heroes', helpText: 'Recommended: 1200x600px or larger' },
          { key: 'contactoHeroTitle', label: 'Contact Page - Title', type: 'text', value: this.currentSettings.contactoHeroTitle, placeholder: 'Enter hero title' },
          { key: 'contactoHeroSubtitle', label: 'Contact Page - Subtitle', type: 'textarea', value: this.currentSettings.contactoHeroSubtitle, placeholder: 'Enter hero subtitle' }
        ]
      },
      /* HIDDEN - Stripe Configuration
      {
        title: 'Stripe Configuration',
        icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
        color: 'purple',
        expanded: false,
        settings: [
          { key: 'stripePublicKey', label: 'Stripe Publishable Key', type: 'text', value: this.currentSettings.stripePublicKey, placeholder: 'pk_live_...', sensitive: true, locked: true, showValue: false },
          { key: 'stripeSecretKey', label: 'Stripe Secret Key', type: 'text', value: this.currentSettings.stripeSecretKey, placeholder: 'sk_live_...', sensitive: true, locked: true, showValue: false },
          { key: 'stripeWebhookSecret', label: 'Stripe Webhook Secret', type: 'text', value: this.currentSettings.stripeWebhookSecret, placeholder: 'whsec_...', sensitive: true, locked: true, showValue: false, description: 'Webhook signing secret from Stripe Dashboard' },
          { key: 'stripeCurrency', label: 'Currency', type: 'select', value: this.currentSettings.stripeCurrency, options: [
            { label: 'USD ($)', value: 'usd' },
            { label: 'EUR (€)', value: 'eur' },
            { label: 'GBP (£)', value: 'gbp' }
          ]},
          { key: 'stripeTestMode', label: 'Test Mode', type: 'boolean', value: this.currentSettings.stripeTestMode, description: 'Use Stripe test keys instead of live keys' }
        ]
      },
      */
      /* HIDDEN - Shipping Settings
      {
        title: 'Shipping Settings',
        icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
        color: 'orange',
        expanded: false,
        settings: [
          { key: 'shippingEnabled', label: 'Enable Shipping', type: 'boolean', value: this.currentSettings.shippingEnabled },
          { key: 'freeShippingThreshold', label: 'Free Shipping Threshold', type: 'number', value: this.currentSettings.freeShippingThreshold, placeholder: '0', description: 'Minimum order value for free shipping' },
          { key: 'defaultShippingCost', label: 'Default Shipping Cost', type: 'number', value: this.currentSettings.defaultShippingCost, placeholder: '0' },
          { key: 'shippingEstimate', label: 'Shipping Estimate (days)', type: 'text', value: this.currentSettings.shippingEstimate, placeholder: 'e.g., 3-5 business days' }
        ]
      },
      */
      {
        title: 'SEO & Meta',
        icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
        color: 'indigo',
        expanded: false,
        settings: [
          { key: 'metaTitle', label: 'Default Meta Title', type: 'text', value: this.currentSettings.metaTitle, placeholder: 'Your Site Name - Tagline' },
          { key: 'metaDescription', label: 'Meta Description', type: 'textarea', value: this.currentSettings.metaDescription, placeholder: 'Brief description of your site...' },
          { key: 'metaKeywords', label: 'Meta Keywords', type: 'text', value: this.currentSettings.metaKeywords, placeholder: 'keyword1, keyword2, keyword3' },
          { key: 'ogImage', label: 'Open Graph Image', type: 'image', value: this.currentSettings.ogImage, storagePath: 'settings/og-images', helpText: 'Recommended: 1200x630px for social media sharing' },
          { key: 'twitterCard', label: 'Twitter Card Type', type: 'select', value: this.currentSettings.twitterCard, options: [
            { label: 'Summary', value: 'summary' },
            { label: 'Summary Large Image', value: 'summary_large_image' }
          ]}
        ]
      },
      {
        title: 'Social Media',
        icon: 'M13 10V3L4 14h7v7l9-11h-7z',
        color: 'pink',
        expanded: false,
        settings: [
          { key: 'facebookUrl', label: 'Facebook URL', type: 'text', value: this.currentSettings.facebookUrl, placeholder: 'https://facebook.com/yourpage' },
          { key: 'twitterUrl', label: 'Twitter/X URL', type: 'text', value: this.currentSettings.twitterUrl, placeholder: 'https://twitter.com/yourhandle' },
          { key: 'instagramUrl', label: 'Instagram URL', type: 'text', value: this.currentSettings.instagramUrl, placeholder: 'https://instagram.com/yourhandle' },
          { key: 'linkedinUrl', label: 'LinkedIn URL', type: 'text', value: this.currentSettings.linkedinUrl, placeholder: 'https://linkedin.com/company/yourcompany' },
          { key: 'youtubeUrl', label: 'YouTube URL', type: 'text', value: this.currentSettings.youtubeUrl, placeholder: 'https://youtube.com/@yourchannel' },
          { key: 'whatsappNumber', label: 'WhatsApp Number', type: 'text', value: this.currentSettings.whatsappNumber, placeholder: '+1234567890' }
        ]
      },
      {
        title: 'Stripe Payment',
        icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
        color: 'purple',
        expanded: false,
        settings: [
          { key: 'stripePublicKey', label: 'Stripe Public Key', type: 'text', value: this.currentSettings.stripePublicKey, placeholder: 'pk_test_...' },
          { key: 'stripeSecretKey', label: 'Stripe Secret Key', type: 'text', value: this.currentSettings.stripeSecretKey, placeholder: 'sk_test_...', sensitive: true },
          { key: 'stripeWebhookSecret', label: 'Stripe Webhook Secret', type: 'text', value: this.currentSettings.stripeWebhookSecret, placeholder: 'whsec_...', sensitive: true },
          { key: 'stripeCurrency', label: 'Currency Code', type: 'select', value: this.currentSettings.stripeCurrency, options: [
            { label: 'USD - US Dollar', value: 'usd' },
            { label: 'EUR - Euro', value: 'eur' },
            { label: 'GBP - British Pound', value: 'gbp' },
            { label: 'CAD - Canadian Dollar', value: 'cad' },
            { label: 'AUD - Australian Dollar', value: 'aud' }
          ]},
          { key: 'stripeTestMode', label: 'Test Mode', type: 'boolean', value: this.currentSettings.stripeTestMode, description: 'Use test API keys (disable for production)' }
        ]
      },
      {
        title: 'Shipping',
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
        color: 'blue',
        expanded: false,
        settings: [
          { key: 'shippingEnabled', label: 'Enable Shipping', type: 'boolean', value: this.currentSettings.shippingEnabled, description: 'Enable shipping options for orders' },
          { key: 'defaultShippingCost', label: 'Default Shipping Cost', type: 'number', value: this.currentSettings.defaultShippingCost, placeholder: '9.99' },
          { key: 'freeShippingThreshold', label: 'Free Shipping Threshold', type: 'number', value: this.currentSettings.freeShippingThreshold, placeholder: '100', description: 'Order total for free shipping (0 = disabled)' },
          { key: 'shippingEstimate', label: 'Shipping Estimate', type: 'text', value: this.currentSettings.shippingEstimate, placeholder: '3-5 business days' }
        ]
      },
      {
        title: 'Email',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        color: 'indigo',
        expanded: false,
        settings: [
          { key: 'emailProvider', label: 'Email Provider', type: 'select', value: this.currentSettings.emailProvider, options: [
            { label: 'SendGrid', value: 'sendgrid' },
            { label: 'Brevo (Sendinblue)', value: 'brevo' },
            { label: 'Mailgun', value: 'mailgun' },
            { label: 'AWS SES', value: 'ses' }
          ]},
          { key: 'emailApiKey', label: 'Email API Key', type: 'text', value: this.currentSettings.emailApiKey, placeholder: 'your-api-key', sensitive: true },
          { key: 'emailFrom', label: 'From Email Address', type: 'text', value: this.currentSettings.emailFrom, placeholder: 'noreply@example.com' },
          { key: 'emailFromName', label: 'From Name', type: 'text', value: this.currentSettings.emailFromName, placeholder: 'Your Store' }
        ]
      },

      {
        title: 'Business Info',
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
        color: 'teal',
        expanded: false,
        settings: [
          { key: 'businessName', label: 'Legal Business Name', type: 'text', value: this.currentSettings.businessName, placeholder: 'Your Company LLC' },
          { key: 'taxId', label: 'Tax ID / VAT Number', type: 'text', value: this.currentSettings.taxId, placeholder: 'XX-XXXXXXX' },
          { key: 'businessRegistration', label: 'Business Registration Number', type: 'text', value: this.currentSettings.businessRegistration, placeholder: 'REG123456' },
          { key: 'supportHours', label: 'Support Hours', type: 'text', value: this.currentSettings.supportHours, placeholder: 'Mon-Fri 9AM-5PM EST' },
          { key: 'returnPolicy', label: 'Return Policy URL', type: 'text', value: this.currentSettings.returnPolicy, placeholder: '/return-policy' },
          { key: 'privacyPolicy', label: 'Privacy Policy URL', type: 'text', value: this.currentSettings.privacyPolicy, placeholder: '/privacy-policy' },
          { key: 'termsOfService', label: 'Terms of Service URL', type: 'text', value: this.currentSettings.termsOfService, placeholder: '/terms' }
        ]
      },
      /* HIDDEN - Inventory
      {
        title: 'Inventory',
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
        color: 'emerald',
        expanded: false,
        settings: [
          { key: 'trackInventory', label: 'Track Inventory', type: 'boolean', value: this.currentSettings.trackInventory, description: 'Enable stock tracking' },
          { key: 'allowBackorders', label: 'Allow Backorders', type: 'boolean', value: this.currentSettings.allowBackorders, description: 'Accept orders when out of stock' },
          { key: 'autoRestockEnabled', label: 'Auto Restock Notifications', type: 'boolean', value: this.currentSettings.autoRestockEnabled },
          { key: 'hideOutOfStock', label: 'Hide Out of Stock Products', type: 'boolean', value: this.currentSettings.hideOutOfStock },
          { key: 'stockReserveTime', label: 'Cart Stock Reserve Time (min)', type: 'number', value: this.currentSettings.stockReserveTime, placeholder: '15' }
        ]
      }
      */
    ];
  }

  async saveSettings() {
    this.isSaving = true;
    this.clearMessage();

    try {
      // CRITICAL: Fetch fresh settings from Firestore to get latest heroImagesJson
      const freshSettings = await this.settingsService.getSettings(true);
      
      const updatedSettings: AppSettings = { ...freshSettings };

      this.sections.forEach(section => {
        section.settings.forEach(setting => {
          const key = setting.key;
          const value = setting.value;
          (updatedSettings as any)[key] = value;
        });
      });

      // CRITICAL: Ensure empty strings don't overwrite existing values
      // If a sensitive field is empty/undefined, preserve the existing value from Firestore
      if (!updatedSettings.stripeSecretKey && this.currentSettings?.stripeSecretKey) {
        updatedSettings.stripeSecretKey = this.currentSettings.stripeSecretKey;
      }
      if (!updatedSettings.stripePublicKey && this.currentSettings?.stripePublicKey) {
        updatedSettings.stripePublicKey = this.currentSettings.stripePublicKey;
      }
      if (!updatedSettings.emailApiKey && this.currentSettings?.emailApiKey) {
        updatedSettings.emailApiKey = this.currentSettings.emailApiKey;
      }
      if (!updatedSettings.recaptchaSiteKey && this.currentSettings?.recaptchaSiteKey) {
        updatedSettings.recaptchaSiteKey = this.currentSettings.recaptchaSiteKey;
      }

      // Normalize social media URLs
      updatedSettings.facebookUrl = this.normalizeSocialMediaUrl(updatedSettings.facebookUrl, 'facebook.com');
      updatedSettings.twitterUrl = this.normalizeSocialMediaUrl(updatedSettings.twitterUrl, 'twitter.com', 'x.com');
      updatedSettings.instagramUrl = this.normalizeSocialMediaUrl(updatedSettings.instagramUrl, 'instagram.com');
      updatedSettings.linkedinUrl = this.normalizeSocialMediaUrl(updatedSettings.linkedinUrl, 'linkedin.com');
      updatedSettings.youtubeUrl = this.normalizeSocialMediaUrl(updatedSettings.youtubeUrl, 'youtube.com');
      
      await this.settingsService.saveSettings(updatedSettings);
      this.currentSettings = updatedSettings;
      
      this.buildSections();
      this.showMessage('admin.settings.feedback.success', 'success');
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      this.showMessage('admin.settings.feedback.error_details', 'error', { message });
    } finally {
      this.isSaving = false;
    }
  }


  /**
   * Normalizes social media URLs by ensuring they start with https://
   * Handles cases where users input:
   * - instagram.com/username
   * - www.instagram.com/username
   * - http://instagram.com/username
   * - https://instagram.com/username (already correct)
   * - @username or username (adds full URL)
   */
  private normalizeSocialMediaUrl(url: string, ...domains: string[]): string {
    if (!url || url.trim() === '') {
      return '';
    }

    let normalized = url.trim();

    // If it starts with @, remove it
    if (normalized.startsWith('@')) {
      normalized = normalized.substring(1);
    }

    // Check if it already has a protocol
    const hasProtocol = /^https?:\/\//i.test(normalized);
    
    if (hasProtocol) {
      // Ensure it's https, not http
      return normalized.replace(/^http:\/\//i, 'https://');
    }

    // Check if it starts with any of the provided domains (with or without www.)
    for (const domain of domains) {
      const patterns = [
        new RegExp(`^www\.${domain.replace('.', '\\.')}\/`, 'i'),
        new RegExp(`^${domain.replace('.', '\\.')}\/`, 'i')
      ];

      for (const pattern of patterns) {
        if (pattern.test(normalized)) {
          // Add https:// prefix
          return `https://${normalized.replace(/^www\./i, '')}`;
        }
      }
    }

    // If no domain prefix found, assume it's just a username and add the first domain
    if (domains.length > 0 && !normalized.includes('/')) {
      return `https://${domains[0]}/${normalized}`;
    }

    // If it contains a slash but no protocol, add https://
    if (normalized.includes('/') && !hasProtocol) {
      return `https://${normalized}`;
    }

    return normalized;
  }

  getFieldId(sectionTitle: string, key: keyof AppSettings): string {
    const sanitized = sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${sanitized}-${String(key)}`;
  }

  getSectionColorClasses(color: string): string {
    const colorMap: { [key: string]: string } = {
      'blue': 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      'purple': 'bg-purple-500/10 border-purple-500/30 text-purple-400',
      'green': 'bg-green-500/10 border-green-500/30 text-green-400',
      'orange': 'bg-bitcoin-orange/10 border-bitcoin-orange/30 text-bitcoin-orange',
      'cyan': 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
      'indigo': 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      'pink': 'bg-pink-500/10 border-pink-500/30 text-pink-400',
      'red': 'bg-red-500/10 border-red-500/30 text-red-400',
      'yellow': 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
      'teal': 'bg-teal-500/10 border-teal-500/30 text-teal-400',
      'gray': 'bg-gray-500/10 border-gray-500/30 text-gray-400',
      'emerald': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    };
    return colorMap[color] || colorMap['blue'];
  }

  getSelectedOptionLabel(setting: Setting): string {
    if (!setting.options || !setting.value) {
      return String(setting.value || '');
    }
    const option = setting.options.find(opt => opt.value === setting.value);
    return option?.label || String(setting.value);
  }

  private showMessage(key: string, type: MessageType, params: Record<string, unknown> = {}) {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
    this.messageKey = key;
    this.messageType = type;
    this.messageParams = params;

    this.messageTimeout = setTimeout(() => this.clearMessage(), 3500);
  }

  private clearMessage() {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
    this.messageKey = null;
    this.messageParams = {};
  }

  toggleLock(setting: Setting, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setting.locked = !setting.locked;
  }

  toggleVisibility(setting: Setting, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setting.showValue = !setting.showValue;
  }

  toggleSection(section: SettingSection, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    section.expanded = !section.expanded;
  }

  isDisabled(setting: Setting): boolean {
    return setting.locked === true;
  }

  getInputType(setting: Setting): string {
    if (setting.type === 'text' && setting.sensitive && !setting.showValue) {
      return 'password';
    }
    if (setting.type === 'text' || setting.type === 'number') {
      return setting.type;
    }
    return 'text';
  }

  /**
   * Get display value for sensitive fields
   * Only shows last 8 characters when revealed
   */
  getDisplayValue(setting: Setting): string {
    if (!setting.sensitive || !setting.value) {
      return setting.value || '';
    }

    // Always mask sensitive fields - show only last 4 characters for security
    if (typeof setting.value === 'string' && setting.value.length > 4) {
      const lastChars = setting.value.slice(-4);
      const maskedLength = Math.min(setting.value.length - 4, 20); // Cap mask length
      return '•'.repeat(maskedLength) + lastChars;
    }

    return setting.value;
  }

  /**
   * Handle input for sensitive fields
   */
  onSensitiveInput(setting: Setting, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newValue = input.value;
    
    // Only update if it's not the masked display value
    if (!newValue.includes('•')) {
      setting.value = newValue;
    }
    this.onSettingValueChange();
  }

  onSettingValueChange(): void {
    return;
  }

}






