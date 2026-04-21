import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudioContentService } from '../../services/studio-content.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { CaseStudy } from '../../models/studio';
import { PortfolioLightboxComponent } from '../../features/work/portfolio-lightbox';

@Component({
  selector: 'app-work-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PortfolioLightboxComponent],
  templateUrl: './work.page.html',
  styleUrl: './work.page.scss'
})
export class WorkPageComponent {
  private content = inject(StudioContentService);
  private analytics = inject(AnalyticsService);
  private seo = inject(SeoSchemaService);

  protected readonly activeFilter = signal<'all' | 'hospitality' | 'trade' | 'corporate' | 'architectural'>('all');
  protected readonly filters = ['all', 'hospitality', 'trade', 'corporate', 'architectural'] as const;
  protected caseStudies = signal<CaseStudy[]>([]);
  protected featured = signal<CaseStudy | null>(null);
  protected filteredCaseStudies = computed(() => {
    const filter = this.activeFilter();
    const items = this.caseStudies().filter(item => !item.featured);
    return filter === 'all' ? items : items.filter(item => item.clientType === filter);
  });

  // AMK-47 — Portfolio Project Detail Lightbox state
  protected readonly selectedCaseStudy = signal<CaseStudy | null>(null);
  protected readonly lightboxOpen = signal<boolean>(false);

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Selected Engraving Work for Hospitality, Trade, and Corporate Clients | Amarka',
      description: 'View selected commissions from Amarka across hospitality, architectural signage, trade supply, and corporate environments across Connecticut and the tri-state region.',
      keywords: ['custom signage Connecticut trade', 'laser engraving portfolio Connecticut', 'architectural engraving hospitality'],
      path: '/work'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/work' });
    void this.load();
  }

  protected setFilter(filter: 'all' | 'hospitality' | 'trade' | 'corporate' | 'architectural') {
    this.activeFilter.set(filter);
    this.analytics.trackLeadEvent('case_study_filter_used', { filter });
  }

  protected openLightbox(caseStudy: CaseStudy) {
    this.selectedCaseStudy.set(caseStudy);
    this.lightboxOpen.set(true);
    this.analytics.trackLeadEvent('case_study_detail_opened', {
      caseStudyId: caseStudy.id,
      slug: caseStudy.slug,
      clientType: caseStudy.clientType,
    });
  }

  protected onLightboxClosed() {
    this.lightboxOpen.set(false);
  }

  protected onCardKeydown(event: KeyboardEvent, caseStudy: CaseStudy) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openLightbox(caseStudy);
    }
  }

  private async load() {
    const items = await this.content.getCaseStudies();
    this.caseStudies.set(items);
    this.featured.set(items.find(item => item.featured) ?? null);
  }
}
