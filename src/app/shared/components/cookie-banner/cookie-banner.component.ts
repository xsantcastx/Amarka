import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ConsentService } from '../../../services/consent.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.scss'
})
export class CookieBannerComponent implements OnInit {
  private consentService = inject(ConsentService);
  
  showBanner = false;
  showSettings = false;
  
  // Custom consent toggles
  analyticsConsent = false;
  marketingConsent = false;
  preferencesConsent = false;

  ngOnInit() {
    // Delay check to ensure localStorage is available after SSR hydration
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.showBanner = !this.consentService.hasUserResponded();
      }, 100);
    }
  }

  acceptAll() {
    console.log('Accept All clicked');
    this.consentService.acceptAll();
    this.showBanner = false;
    this.showSettings = false;
  }

  rejectAll() {
    console.log('Reject All clicked');
    this.consentService.rejectAll();
    this.showBanner = false;
    this.showSettings = false;
  }

  openSettings() {
    this.showSettings = true;
    const current = this.consentService.getCurrentConsent();
    this.analyticsConsent = current.analytics;
    this.marketingConsent = current.marketing;
    this.preferencesConsent = current.preferences;
  }

  closeSettings() {
    this.showSettings = false;
  }

  saveCustomPreferences() {
    this.consentService.saveCustomConsent(
      this.analyticsConsent,
      this.marketingConsent,
      this.preferencesConsent
    );
    this.showBanner = false;
    this.showSettings = false;
  }
}
