import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BrandConfigService } from '../../core/services/brand-config.service';
import { StudioContentService } from '../../services/studio-content.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { CaseStudy, HomeContent, ServiceCommission, StudioSettings } from '../../models/studio';
// AMK-62: Scroll-triggered section reveal directives
import { RevealDirective, RevealStaggerDirective } from '../../shared/reveal';
// AMK-45: Trade Client Trust Bar — social proof strip below hero
import { TradeTrustBarComponent } from '../../features/home/trade-trust-bar';
// AMK-46: Interactive Substrate Explorer — hover-reveal material tiles
import { SubstrateExplorerComponent } from '../../features/home/substrate-explorer';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule, RevealDirective, RevealStaggerDirective, TradeTrustBarComponent, SubstrateExplorerComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePageComponent {
  private brand = inject(BrandConfigService);
  private content = inject(StudioContentService);
  private seo = inject(SeoSchemaService);

  protected studio = signal<StudioSettings | null>(null);
  protected homeContent = signal<HomeContent | null>(null);
  protected featuredCaseStudies = signal<CaseStudy[]>([]);
  protected featuredProject = signal<CaseStudy | null>(null);
  protected services = signal<ServiceCommission[]>([]);

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Amarka | Bespoke Laser Engraving Studio — Stamford, CT for the Trade',
      description: 'Bespoke laser engraving studio serving interior designers, general contractors, hospitality groups, and corporate operators across Connecticut and the tri-state region from Stamford, CT.',
      keywords: ['laser engraving Stamford CT', 'bespoke engraved signage Connecticut', 'laser engraving for interior designers Connecticut'],
      path: '/'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/' });
    void this.load();
  }

  protected get hero() {
    return this.brand.site.hero;
  }

  private async load() {
    const [studio, homeContent, caseStudies, services] = await Promise.all([
      this.content.getStudioSettings(),
      this.content.getHomeContent(),
      this.content.getCaseStudies(),
      this.content.getServices()
    ]);
    this.studio.set(studio);
    this.homeContent.set(homeContent);
    this.featuredProject.set(caseStudies.find(item => item.slug === homeContent.featuredProjectSlug) ?? null);
    this.featuredCaseStudies.set(caseStudies.slice(0, 3));
    this.services.set(services.slice(0, 3));
  }
}
