import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoryService } from '../../../services/category.service';
import { SettingsService, AppSettings } from '../../../services/settings.service';
import { BrandConfigService } from '../../services/brand-config.service';

interface Category {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  order?: number;
  active?: boolean;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  template: `
    <footer class="py-14 bg-ts-bg border-t border-ts-line">
      <div class="page-container">
        <div class="grid md:grid-cols-4 gap-10 mb-12">
          <div class="md:col-span-2">
            <div class="flex items-center gap-3 mb-4">
              <img [src]="brandLogo" [alt]="siteName" class="h-10 w-10 rounded-lg shadow-soft" />
              <span class="font-serif text-xl font-semibold text-ts-ink">{{ siteName }}</span>
            </div>
            <p class="text-ts-ink-soft mb-6 max-w-md">
              {{ 'footer.description' | translate }}
            </p>
            @if (supportHours) {
              <p class="text-ts-ink-soft text-sm mb-4">
                <span class="text-ts-ink font-semibold">{{ 'footer.business_hours' | translate }}:</span> {{ supportHours }}
              </p>
            }
            <div class="flex gap-3">
              @if (linkedinUrl) {
                <a [href]="linkedinUrl" target="_blank" rel="noopener noreferrer" class="footer__social">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              }
              @if (instagramUrl) {
                <a [href]="instagramUrl" target="_blank" rel="noopener noreferrer" class="footer__social">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              }
              @if (facebookUrl) {
                <a [href]="facebookUrl" target="_blank" rel="noopener noreferrer" class="footer__social">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12a10 10 0 10-11.5 9.87v-6.99h-2.7V12h2.7V9.8c0-2.66 1.58-4.13 4-4.13 1.16 0 2.38.21 2.38.21v2.62h-1.34c-1.32 0-1.73.82-1.73 1.66V12h2.95l-.47 2.88h-2.48v6.99A10 10 0 0022 12z"/>
                  </svg>
                </a>
              }
            </div>
          </div>

          <div>
            <h3 class="footer__heading">{{ 'footer.explore' | translate }}</h3>
            <div class="footer__links">
              <a routerLink="/" class="footer__link">{{ 'nav.home' | translate }}</a>
              <a routerLink="/servicios" class="footer__link">{{ 'page_titles.services' | translate }}</a>
              <a routerLink="/galeria" class="footer__link">{{ 'page_titles.gallery' | translate }}</a>
              <a routerLink="/contacto" class="footer__link">{{ 'page_titles.contact' | translate }}</a>
            </div>
          </div>

          <div>
            <h3 class="footer__heading">{{ 'footer.contact' | translate }}</h3>
            <div class="footer__links">
              <a [href]="'mailto:' + contactEmail" class="footer__link">{{ contactEmail }}</a>
              <a [href]="'tel:' + contactPhone" class="footer__link">{{ contactPhone }}</a>
              @if (contactAddress) {
                <p class="footer__text whitespace-pre-line">{{ contactAddress }}</p>
              }
              @if (supportHours) {
                <p class="footer__text">{{ supportHours }}</p>
              }
            </div>
          </div>
        </div>

        <div class="border-t border-ts-line pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-ts-ink-soft text-sm">
          <p class="m-0">&copy; {{ currentYear }} {{ siteName }}. {{ 'footer.rights' | translate }}</p>
          <div class="flex gap-4">
            <a [routerLink]="privacyPolicyUrl" class="footer__link">{{ 'footer.privacy' | translate }}</a>
            <a [routerLink]="termsOfServiceUrl" class="footer__link">{{ 'footer.terms' | translate }}</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private settingsService = inject(SettingsService);
  private brandConfig = inject(BrandConfigService);

  categories: Category[] = [];
  currentYear = new Date().getFullYear();

  // Brand defaults; overwritten by brand config + settings
  siteName = '';
  brandLogo = '';
  contactEmail = '';
  contactPhone = '';
  contactAddress = '';

  facebookUrl = '';
  twitterUrl = '';
  instagramUrl = '';
  linkedinUrl = '';
  youtubeUrl = '';
  whatsappNumber = '';

  businessName = '';
  supportHours = '';
  returnPolicyUrl = '';
  privacyPolicyUrl = '';
  termsOfServiceUrl = '';

  constructor() {
    // Initialize from brand config before any template binding runs
    this.siteName = this.brandConfig.siteName;
    this.brandLogo = this.brandConfig.site.brand.logo;
    this.contactEmail = this.brandConfig.site.contact.email;
    this.contactPhone = this.brandConfig.site.contact.phone || '';
    this.contactAddress = this.brandConfig.site.contact.address || '';

    this.settingsService.settings$
      .pipe(takeUntilDestroyed())
      .subscribe(settings => this.applySettings(settings));
  }

  ngOnInit() {
    this.loadCategories();
    this.settingsService.getSettings().then(settings => this.applySettings(settings));
  }

  private applySettings(settings: AppSettings) {
    if (!settings) return;

    this.siteName = settings.siteName || this.siteName;
    this.brandLogo = settings.brandLogo || this.brandLogo;
    this.contactEmail = settings.contactEmail || this.contactEmail;
    this.contactPhone = settings.contactPhone || this.contactPhone;
    this.contactAddress = settings.contactAddress || this.contactAddress;

    this.facebookUrl = settings.facebookUrl || '';
    this.twitterUrl = settings.twitterUrl || '';
    this.instagramUrl = settings.instagramUrl || '';
    this.linkedinUrl = settings.linkedinUrl || '';
    this.youtubeUrl = settings.youtubeUrl || '';
    this.whatsappNumber = settings.whatsappNumber || '';

    this.businessName = settings.businessName || settings.siteName;
    this.supportHours = settings.supportHours || '';
    this.returnPolicyUrl = settings.returnPolicy || '/return-policy';
    this.privacyPolicyUrl = settings.privacyPolicy || '/privacy-policy';
    this.termsOfServiceUrl = settings.termsOfService || '/terms';
  }

  private loadCategories() {
    this.categoryService.getAllCategories().subscribe({
      next: (categories: Category[]) => {
        this.categories = categories
          .filter((cat: Category) => cat.active !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .slice(0, 3);
      },
      error: (error: any) => {
        console.error('Error loading categories for footer:', error);
      }
    });
  }

  private getSocialUrl(platform: string): string {
    const match = this.brandConfig.nav.social.find((link: { platform: string; href: string }) => link.platform === platform);
    return match?.href || '';
  }

  getWhatsAppUrl(): string {
    if (!this.whatsappNumber) return '#';
    const cleanNumber = this.whatsappNumber.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}`;
  }
}
