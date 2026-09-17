import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BrandConfigService } from '../../core/services/brand-config.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { RevealDirective, RevealStaggerDirective } from '../../shared/reveal';
import { AmkThemeService } from '../../shared/amk-theme/amk-theme.service';

interface HomeService {
  num: string;
  title: string;
  description: string;
}

interface HomeIndustry {
  title: string;
  note: string;
}

const SERVICES: HomeService[] = [
  { num: '01', title: 'Corporate Apparel', description: 'Embroidered uniforms and workwear that make every team member look like part of something bigger.' },
  { num: '02', title: 'Laser Engraving', description: 'Precision-etched drinkware, plaques, and signage — permanent, premium, unmistakably yours.' },
  { num: '03', title: 'Promotional Products', description: 'DTF, screen print & UV printing on the items your clients actually use and remember.' },
  { num: '04', title: 'Corporate Gifts & Welcome Kits', description: 'Client appreciation gifts and employee welcome kits that open the door to a lasting relationship.' },
  { num: '05', title: 'Drinkware & Tumblers', description: 'The gift your clients carry everywhere — engraved, branded, built to last.' },
  { num: '06', title: 'Event Merchandise', description: 'Branded kits and swag that turn a one-time event into an ongoing impression.' }
];

const INDUSTRIES: HomeIndustry[] = [
  { title: 'Restaurants & Cafes', note: 'Branded uniforms & guest gifts' },
  { title: 'Real Estate', note: 'Premium client tumblers & gifts' },
  { title: 'Construction', note: 'Embroidered workwear' },
  { title: 'Medical & Clinics', note: 'Scrubs & branded apparel' },
  { title: 'Hotels', note: 'Guest amenities & staff kits' },
  { title: 'Law & Insurance', note: 'Executive corporate gifts' },
  { title: 'Gyms & Salons', note: 'Team apparel & merch' },
  { title: 'Retail & Corporate', note: 'Employee welcome kits' }
];

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule, RevealDirective, RevealStaggerDirective],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePageComponent {
  private brand = inject(BrandConfigService);
  private seo = inject(SeoSchemaService);
  protected readonly themeService = inject(AmkThemeService);

  protected readonly services = SERVICES;
  protected readonly industries = INDUSTRIES;

  protected readonly theme = this.themeService.theme;
  protected readonly logoSrc = this.themeService.logoSrc;

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Amarka | Corporate Merchandise, Engraving & Brand Solutions — Miami, FL',
      description: 'Amarka helps businesses bring their brand into the real world through custom merchandise, engraving, branded apparel, and promotional products — premium corporate gifts for businesses in Miami & South Florida.',
      keywords: ['corporate merchandise Miami', 'custom engraving Miami FL', 'branded apparel for businesses', 'corporate gifts Miami'],
      path: '/'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/' });
  }

  protected get hero() {
    return this.brand.site.hero;
  }

  protected get brandInfo() {
    return this.brand.site.brand;
  }

  protected toggleTheme(): void {
    this.themeService.toggle();
  }
}
