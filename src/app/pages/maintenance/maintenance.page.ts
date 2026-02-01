import { Component, OnInit, inject, PLATFORM_ID, Optional, Inject } from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RESPONSE } from './maintenance.tokens';
import { BrandConfigService } from '../../core/services/brand-config.service';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './maintenance.page.html',
  styleUrls: ['./maintenance.page.scss']
})
export class MaintenancePage implements OnInit {
  private meta = inject(Meta);
  private title = inject(Title);
  private platformId = inject(PLATFORM_ID);
  private brandConfig = inject(BrandConfigService);
  private socialLinks = this.brandConfig.nav.social as Array<{ platform: string; href: string }>;
  
  // Expected return time (in hours from now)
  expectedReturnTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  retryAfterSeconds = 7200; // 2 hours in seconds
  readonly brandName = this.brandConfig.siteName;
  readonly brandLogo = this.brandConfig.site.brand.logo;
  readonly maintenanceDescription =
    this.brandConfig.site.maintenance?.description ||
    `${this.brandName} is currently undergoing scheduled maintenance. We will be back soon.`;
  readonly legalName = this.brandConfig.legalName;
  readonly contactEmail = this.brandConfig.site.contact.email;
  readonly statusLink = this.socialLinks.find(link => ['twitter', 'x'].includes(link.platform))?.href || '';
  readonly currentYear = new Date().getFullYear();

  constructor(
    @Optional() @Inject(RESPONSE) private response: any
  ) {}

  ngOnInit() {
    const brandName = this.brandConfig.siteName;
    const maintenanceCopy = this.brandConfig.site.maintenance?.description ||
      `${brandName} is currently undergoing scheduled maintenance. We will be back online shortly.`;
    const maintenanceTitle = this.brandConfig.site.maintenance?.title || 'Site Maintenance';
    this.title.setTitle(`${maintenanceTitle} - ${brandName}`);
    
    // Add noindex meta tag to prevent indexing during maintenance
    this.meta.addTags([
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'description', content: maintenanceCopy }
    ]);

    // Set 503 status code for server-side rendering
    if (isPlatformServer(this.platformId) && this.response) {
      try {
        this.response.status(503);
        this.response.setHeader('Retry-After', this.retryAfterSeconds.toString());
        this.response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } catch (error) {
        void 0;
      }
    }
  }

  get formattedReturnTime(): string {
    return this.expectedReturnTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }
}
