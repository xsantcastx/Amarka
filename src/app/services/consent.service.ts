import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

// Declare gtag for Consent Mode v2
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  hasResponded: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConsentService {
  private platformId = inject(PLATFORM_ID);
  private readonly CONSENT_KEY = 'CreaDevents_user_consent';
  
  private consentState = new BehaviorSubject<ConsentState>({
    analytics: false,
    marketing: false,
    preferences: false,
    hasResponded: false
  });

  public consent$ = this.consentState.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Delay initialization to ensure localStorage is fully available after hydration
      setTimeout(() => {
        this.initializeConsentMode();
        this.loadSavedConsent();
      }, 0);
    }
  }

  /**
   * Initialize Google Consent Mode v2 (GDPR compliant)
   * Defaults to denied until user accepts
   */
  private initializeConsentMode() {
    if (typeof window === 'undefined') return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    
    // Define gtag function
    if (!window.gtag) {
      window.gtag = function gtag(...args: any[]) {
        window.dataLayer.push(args);
      };
    }

    // Set default consent to denied (GDPR requirement)
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted' // Security cookies are always allowed
    });
  }

  /**
   * Load previously saved consent from localStorage
   */
  private loadSavedConsent() {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(this.CONSENT_KEY);
      if (saved) {
        const consent: ConsentState = JSON.parse(saved);
        this.consentState.next(consent);
        
        if (consent.hasResponded) {
          this.updateConsentMode(consent);
        }
      }
    } catch (error) {
      void 0;
    }
  }

  /**
   * Accept all cookies (Analytics + Marketing)
   */
  acceptAll() {
    const consent: ConsentState = {
      analytics: true,
      marketing: true,
      preferences: true,
      hasResponded: true
    };
    
    this.saveConsent(consent);
    this.updateConsentMode(consent);
  }

  /**
   * Accept only essential cookies (reject analytics)
   */
  rejectAll() {
    const consent: ConsentState = {
      analytics: false,
      marketing: false,
      preferences: false,
      hasResponded: true
    };
    
    this.saveConsent(consent);
    this.updateConsentMode(consent);
  }

  /**
   * Save custom consent preferences
   */
  saveCustomConsent(analytics: boolean, marketing: boolean, preferences: boolean) {
    const consent: ConsentState = {
      analytics,
      marketing,
      preferences,
      hasResponded: true
    };
    
    this.saveConsent(consent);
    this.updateConsentMode(consent);
  }

  /**
   * Save consent to localStorage and update state
   */
  private saveConsent(consent: ConsentState) {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.CONSENT_KEY, JSON.stringify(consent));
      this.consentState.next(consent);
    } catch (error) {
      void 0;
    }
  }

  /**
   * Update Google Consent Mode based on user preferences
   */
  private updateConsentMode(consent: ConsentState) {
    if (typeof window === 'undefined' || !window.gtag) return;

    window.gtag('consent', 'update', {
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      functionality_storage: consent.preferences ? 'granted' : 'denied',
      personalization_storage: consent.preferences ? 'granted' : 'denied'
    });
  }

  /**
   * Check if user has already responded to cookie consent
   */
  hasUserResponded(): boolean {
    return this.consentState.value.hasResponded;
  }

  /**
   * Get current consent state
   */
  getCurrentConsent(): ConsentState {
    return this.consentState.value;
  }

  /**
   * Reset consent (for testing or user request)
   */
  resetConsent() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.CONSENT_KEY);
      this.consentState.next({
        analytics: false,
        marketing: false,
        preferences: false,
        hasResponded: false
      });
      
      // Reset to default denied state
      this.initializeConsentMode();
    } catch (error) {
      void 0;
    }
  }
}
